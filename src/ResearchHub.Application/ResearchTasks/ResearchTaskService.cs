using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Application.Common;
using ResearchHub.Domain.Entities;
using ResearchHub.Domain.Enums;
using FluentValidation;

namespace ResearchHub.Application.ResearchTasks
{
    public class ResearchTaskService
    {
        private readonly IResearchTaskRepository _taskRepository;
        private readonly IPaperRepository _paperRepository;
        private readonly IProjectRepository _projectRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IValidator<CreateResearchTaskRequest> _createValidator;
        private readonly IValidator<UpdateResearchTaskRequest> _updateValidator;
        private readonly IValidator<ChangeResearchTaskStatusRequest> _statusValidator;

        public ResearchTaskService(
            IResearchTaskRepository taskRepository,
            IPaperRepository paperRepository,
            IProjectRepository projectRepository,
            IUnitOfWork unitOfWork,
            IValidator<CreateResearchTaskRequest> createValidator,
            IValidator<UpdateResearchTaskRequest> updateValidator,
            IValidator<ChangeResearchTaskStatusRequest> statusValidator)
        {
            _taskRepository = taskRepository;
            _paperRepository = paperRepository;
            _projectRepository = projectRepository;
            _unitOfWork = unitOfWork;
            _createValidator = createValidator;
            _updateValidator = updateValidator;
            _statusValidator = statusValidator;
        }

        public async Task<ResearchTaskDto> CreateAsync(Guid projectId, CreateResearchTaskRequest request, Guid currentUserId)
        {
            await _createValidator.ValidateOrThrowAsync(request);
            var project = await GetProjectOrThrow(projectId);
            EnsureIsMember(project, currentUserId);

            if (request.PaperId.HasValue)
            {
                var paper = await _paperRepository.GetByIdAsync(request.PaperId.Value)
                    ?? throw new KeyNotFoundException("Paper not found.");

                if (paper.ProjectId != projectId)
                    throw new ArgumentException("The linked paper does not belong to this project.");
            }

            if (request.AssignedToUserId.HasValue)
                EnsureAssigneeIsMember(project, request.AssignedToUserId.Value);

            var task = new ResearchTask(
                projectId,
                request.Title,
                request.Description,
                request.Priority,
                currentUserId,
                request.Deadline,
                request.PaperId);

            if (request.AssignedToUserId.HasValue)
                task.AssignTo(request.AssignedToUserId.Value);

            await _taskRepository.AddAsync(task);
            await _unitOfWork.SaveChangesAsync();

            return ToDto(task);
        }
        public async Task<IReadOnlyList<ResearchTaskDto>> GetByProjectIdAsync(Guid projectId, Guid currentUserId)
        {
            var project = await GetProjectOrThrow(projectId);
            EnsureIsMember(project, currentUserId);

            var tasks = await _taskRepository.GetByProjectIdAsync(projectId);
            return tasks.Select(ToDto).ToList();
        }

        public async Task<ResearchTaskDto> GetByIdAsync(Guid taskId, Guid currentUserId)
        {
            var task = await GetTaskOrThrow(taskId);
            var project = await GetProjectOrThrow(task.ProjectId);
            EnsureIsMember(project, currentUserId);

            return ToDto(task);
        }
        public async Task<ResearchTaskDto> UpdateAsync(Guid taskId, UpdateResearchTaskRequest request, Guid currentUserId)
        {
            await _updateValidator.ValidateOrThrowAsync(request);
            var task = await GetTaskOrThrow(taskId);
            var project = await GetProjectOrThrow(task.ProjectId);
            EnsureIsCreatorOrOwner(project, task, currentUserId);

            task.UpdateDetails(request.Title, request.Description, request.Priority, request.Deadline);
            await _unitOfWork.SaveChangesAsync();

            return ToDto(task);
        }

        public async Task DeleteAsync(Guid taskId, Guid currentUserId)
        {
            var task = await GetTaskOrThrow(taskId);
            var project = await GetProjectOrThrow(task.ProjectId);
            EnsureIsCreatorOrOwner(project, task, currentUserId);

            _taskRepository.Remove(task);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task<ResearchTaskDto> AssignAsync(Guid taskId, AssignResearchTaskRequest request, Guid currentUserId)
        {
            var task = await GetTaskOrThrow(taskId);
            var project = await GetProjectOrThrow(task.ProjectId);
            EnsureIsCreatorOrOwner(project, task, currentUserId);

            if (request.UserId.HasValue)
            {
                EnsureAssigneeIsMember(project, request.UserId.Value);
                task.AssignTo(request.UserId.Value);
            }
            else
            {
                task.Unassign();
            }

            await _unitOfWork.SaveChangesAsync();

            return ToDto(task);
        }

        public async Task<ResearchTaskDto> ChangeStatusAsync(Guid taskId, ChangeResearchTaskStatusRequest request, Guid currentUserId)
        {
            await _statusValidator.ValidateOrThrowAsync(request);
            var task = await GetTaskOrThrow(taskId);
            var project = await GetProjectOrThrow(task.ProjectId);
            EnsureIsAssigneeOrOwner(project, task, currentUserId);

            task.ChangeStatus(request.Status);
            await _unitOfWork.SaveChangesAsync();

            return ToDto(task);
        }

        private async Task<ResearchTask> GetTaskOrThrow(Guid taskId) =>
            await _taskRepository.GetByIdAsync(taskId)
                ?? throw new KeyNotFoundException("Task not found.");

        private async Task<ResearchProject> GetProjectOrThrow(Guid projectId) =>
            await _projectRepository.GetByIdAsync(projectId)
                ?? throw new KeyNotFoundException("Project not found.");

        private static ProjectMember EnsureIsMember(ResearchProject project, Guid userId) =>
            project.Members.SingleOrDefault(m => m.UserId == userId)
                ?? throw new ForbiddenAccessException("You are not a member of this project.");

        private static void EnsureAssigneeIsMember(ResearchProject project, Guid assigneeId)
        {
            if (!project.Members.Any(m => m.UserId == assigneeId))
                throw new ArgumentException("The assignee must be a member of this project.");
        }

        private static void EnsureIsCreatorOrOwner(ResearchProject project, ResearchTask task, Guid userId)
        {
            var member = EnsureIsMember(project, userId);

            if (task.CreatedByUserId != userId && member.ProjectRole != ProjectRole.Owner)
                throw new ForbiddenAccessException("Only the task's creator or a project owner can do this.");
        }

        private static void EnsureIsAssigneeOrOwner(ResearchProject project, ResearchTask task, Guid userId)
        {
            var member = EnsureIsMember(project, userId);

            if (task.AssignedToUserId != userId && member.ProjectRole != ProjectRole.Owner)
                throw new ForbiddenAccessException("Only the task's assignee or a project owner can change its status.");
        }

        private static ResearchTaskDto ToDto(ResearchTask task) => new(
            task.Id,
            task.ProjectId,
            task.PaperId,
            task.Title,
            task.Description,
            task.Status,
            task.Priority,
            task.Deadline,
            task.AssignedToUserId,
            task.CreatedByUserId,
            task.CreatedAt,
            task.CompletedAt);
        }
}