using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Application.Common;
using ResearchHub.Domain.Entities;
using ResearchHub.Domain.Enums;
using FluentValidation;

namespace ResearchHub.Application.Projects
{
    public class ProjectService
    {
        private readonly IProjectRepository _projectRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IValidator<CreateProjectRequest> _createValidator;
        private readonly IValidator<UpdateProjectRequest> _updateValidator;
        private readonly IValidator<AddMemberRequest> _addMemberValidator;
        private readonly IUserRepository _userRepository;
        public ProjectService(
            IProjectRepository projectRepository,
            IUnitOfWork unitOfWork,
            IValidator<CreateProjectRequest> createValidator,
            IValidator<UpdateProjectRequest> updateValidator,
            IValidator<AddMemberRequest> addMemberValidator,
            IUserRepository userRepository)
        {
            _projectRepository = projectRepository;
            _unitOfWork = unitOfWork;
            _createValidator = createValidator;
            _updateValidator = updateValidator;
            _addMemberValidator = addMemberValidator;
            _userRepository = userRepository;
        }

        public async Task<ProjectDto> CreateAsync(CreateProjectRequest request, Guid currentUserId)
        {
            await _createValidator.ValidateOrThrowAsync(request);
            var project = new ResearchProject(request.Name, request.Description, currentUserId);

            await _projectRepository.AddAsync(project);
            await _unitOfWork.SaveChangesAsync();

            return await ToDtoAsync(project);
        }

        public async Task<ProjectDto> GetByIdAsync(Guid projectId, Guid currentUserId)
        {
            var project = await GetProjectOrThrow(projectId);

            EnsureIsMember(project, currentUserId);

            return await ToDtoAsync(project);
        }

        public async Task<ProjectDto> UpdateAsync(Guid projectId, UpdateProjectRequest request, Guid currentUserId)
        {
            await _updateValidator.ValidateOrThrowAsync(request);
            var project = await GetProjectOrThrow(projectId);

            EnsureIsOwner(project, currentUserId);

            project.UpdateDetails(request.Name, request.Description);
            await _unitOfWork.SaveChangesAsync();

            return await ToDtoAsync(project);
        } 
        public async Task DeleteAsync(Guid projectId, Guid currentUserId)
        {
            var project = await GetProjectOrThrow(projectId);

            EnsureIsOwner(project, currentUserId);

            await _projectRepository.RemoveWithContentsAsync(project);
            await _unitOfWork.SaveChangesAsync();
        }
        public async Task<ProjectDto> AddMemberAsync(Guid projectId, AddMemberRequest request, Guid currentUserId)
        {
            await _addMemberValidator.ValidateOrThrowAsync(request);
            var project = await GetProjectOrThrow(projectId);

            EnsureIsOwner(project, currentUserId);

            project.AddMember(request.UserId, request.Role);
            await _unitOfWork.SaveChangesAsync();

            return await ToDtoAsync(project);
        }

        public async Task<ProjectDto> RemoveMemberAsync(Guid projectId, Guid memberUserId, Guid currentUserId)
        {
            var project = await GetProjectOrThrow(projectId);

            EnsureIsOwner(project, currentUserId);

            project.RemoveMember(memberUserId);
            await _unitOfWork.SaveChangesAsync();

            return await ToDtoAsync(project);
        }
        private async Task<ResearchProject> GetProjectOrThrow(Guid projectId) =>
            await _projectRepository.GetByIdAsync(projectId)
                ?? throw new KeyNotFoundException("Project not found.");

        private static void EnsureIsMember(ResearchProject project, Guid userId)
        {
            if (!project.Members.Any(m => m.UserId == userId))
                throw new ForbiddenAccessException("You are not a member of this project.");
        }
        private static void EnsureIsOwner(ResearchProject project, Guid userId)
        {
            var member = project.Members.SingleOrDefault(m => m.UserId == userId);
            if (member is null || member.ProjectRole != ProjectRole.Owner)
                throw new ForbiddenAccessException("Only a project owner can perform this action.");
        }

        private async Task<ProjectDto> ToDtoAsync(ResearchProject project)
        {
            var names = await UserNames.LoadAsync(_userRepository, project.Members.Select(m => m.UserId));

            return new ProjectDto(
                project.Id,
                project.Name,
                project.Description,
                project.Status,
                project.CreatedAt,
                project.Members
                    .Select(m => new ProjectMemberDto(m.UserId, names.Of(m.UserId), m.ProjectRole, m.JoinedAt))
                    .ToList());
        }
        public async Task<IReadOnlyList<ProjectSummaryDto>> GetMyProjectsAsync(Guid currentUserId)
        {
            var projects = await _projectRepository.GetByMemberUserIdAsync(currentUserId);

            return projects.Select(p => new ProjectSummaryDto(
                p.Id,
                p.Name,
                p.Description,
                p.Status,
                p.CreatedAt,
                p.Members.Count,
                p.Members.Single(m => m.UserId == currentUserId).ProjectRole)).ToList();
        }  
    }
}