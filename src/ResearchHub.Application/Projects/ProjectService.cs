using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Application.Common;
using ResearchHub.Domain.Entities;
using ResearchHub.Domain.Enums;

namespace ResearchHub.Application.Projects
{
    public class ProjectService
    {
        private readonly IProjectRepository _projectRepository;
        private readonly IUnitOfWork _unitOfWork;
        public ProjectService(IProjectRepository projectRepository, IUnitOfWork unitOfWork)
        {
            _projectRepository = projectRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<ProjectDto> CreateAsync(CreateProjectRequest request, Guid currentUserId)
        {
            var project = new ResearchProject(request.Name, request.Description, currentUserId);

            await _projectRepository.AddAsync(project);
            await _unitOfWork.SaveChangesAsync();

            return ToDto(project);
        }

        public async Task<ProjectDto> GetByIdAsync(Guid projectId, Guid currentUserId)
        {
            var project = await GetProjectOrThrow(projectId);

            EnsureIsMember(project, currentUserId);

            return ToDto(project);
        }

        public async Task<ProjectDto> UpdateAsync(Guid projectId, UpdateProjectRequest request, Guid currentUserId)
        {
            var project = await GetProjectOrThrow(projectId);

            EnsureIsOwner(project, currentUserId);

            project.UpdateDetails(request.Name, request.Description);
            await _unitOfWork.SaveChangesAsync();

            return ToDto(project);
        } 
        public async Task DeleteAsync(Guid projectId, Guid currentUserId)
        {
            var project = await GetProjectOrThrow(projectId);

            EnsureIsOwner(project, currentUserId);

            _projectRepository.Remove(project);
            await _unitOfWork.SaveChangesAsync();
        }
        public async Task<ProjectDto> AddMemberAsync(Guid projectId, AddMemberRequest request, Guid currentUserId)
        {
            var project = await GetProjectOrThrow(projectId);

            EnsureIsOwner(project, currentUserId);

            project.AddMember(request.UserId, request.Role);
            await _unitOfWork.SaveChangesAsync();

            return ToDto(project);
        }

        public async Task<ProjectDto> RemoveMemberAsync(Guid projectId, Guid memberUserId, Guid currentUserId)
        {
            var project = await GetProjectOrThrow(projectId);

            EnsureIsOwner(project, currentUserId);

            project.RemoveMember(memberUserId);
            await _unitOfWork.SaveChangesAsync();

            return ToDto(project);
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

        private static ProjectDto ToDto(ResearchProject project) => new(
            project.Id,
            project.Name,
            project.Description,
            project.Status,
            project.CreatedAt,
            project.Members.Select(m => new ProjectMemberDto(m.UserId, m.ProjectRole, m.JoinedAt)).ToList());  
    }
}