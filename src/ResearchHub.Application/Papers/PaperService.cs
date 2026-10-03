using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Application.Common;
using ResearchHub.Domain.Entities;

namespace ResearchHub.Application.Papers
{
    public class PaperService
    {
        private readonly IPaperRepository _paperRepository;
        private readonly IProjectRepository _projectRepository;
        private readonly ITagRepository _tagRepository;
        private readonly IUnitOfWork _unitOfWork;

        public PaperService(
            IPaperRepository paperRepository,
            IProjectRepository projectRepository,
            ITagRepository tagRepository,
            IUnitOfWork unitOfWork)
        {
            _paperRepository = paperRepository;
            _projectRepository = projectRepository;
            _tagRepository = tagRepository;
            _unitOfWork = unitOfWork;
        }
        public async Task<PaperDto> CreateAsync(Guid projectId, CreatePaperRequest request, Guid currentUserId)
        {
            await EnsureIsProjectMemberAsync(projectId, currentUserId);

            var paper = new ResearchPaper(
                projectId,
                request.Title,
                request.Authors,
                request.Abstract,
                request.PublicationDate,
                request.DoiOrUrl,
                request.PdfReference,
                currentUserId);

            if (request.Tags is not null)
            {
                foreach (var tagName in request.Tags)
                {
                    var tag = await GetOrCreateTagAsync(projectId, tagName);
                    paper.AddTag(tag);
                }
            }

            await _paperRepository.AddAsync(paper);
            await _unitOfWork.SaveChangesAsync();

            return ToDto(paper);
        }
        public async Task<IReadOnlyList<PaperDto>> GetByProjectIdAsync(Guid projectId, PaperFilter? filter, Guid currentUserId)
        {
            await EnsureIsProjectMemberAsync(projectId, currentUserId);

            var papers = await _paperRepository.GetByProjectIdAsync(projectId, filter);
            return papers.Select(ToDto).ToList();
        }
        public async Task<PaperDto> GetByIdAsync(Guid paperId, Guid currentUserId)
        {
            var paper = await GetPaperOrThrow(paperId);
            await EnsureIsProjectMemberAsync(paper.ProjectId, currentUserId);

            return ToDto(paper);
        }
        public async Task<PaperDto> UpdateAsync(Guid paperId, UpdatePaperRequest request, Guid currentUserId)
        {
            var paper = await GetPaperOrThrow(paperId);
            await EnsureIsProjectMemberAsync(paper.ProjectId, currentUserId);

            paper.UpdateDetails(
                request.Title,
                request.Authors,
                request.Abstract,
                request.PublicationDate,
                request.DoiOrUrl,
                request.PdfReference);

            await _unitOfWork.SaveChangesAsync();

            return ToDto(paper);
        }
        public async Task DeleteAsync(Guid paperId, Guid currentUserId)
        {
            var paper = await GetPaperOrThrow(paperId);
            await EnsureIsProjectMemberAsync(paper.ProjectId, currentUserId);

            _paperRepository.Remove(paper);
            await _unitOfWork.SaveChangesAsync();
        }
        public async Task<PaperDto> AddTagAsync(Guid paperId, string tagName, Guid currentUserId)
        {
            var paper = await GetPaperOrThrow(paperId);
            await EnsureIsProjectMemberAsync(paper.ProjectId, currentUserId);

            var tag = await GetOrCreateTagAsync(paper.ProjectId, tagName);
            paper.AddTag(tag);

            await _unitOfWork.SaveChangesAsync();

            return ToDto(paper);
        }

        public async Task<PaperDto> RemoveTagAsync(Guid paperId, Guid tagId, Guid currentUserId)
        {
            var paper = await GetPaperOrThrow(paperId);
            await EnsureIsProjectMemberAsync(paper.ProjectId, currentUserId);

            paper.RemoveTag(tagId);
            await _unitOfWork.SaveChangesAsync();

            return ToDto(paper);
        }

        private async Task<Tag> GetOrCreateTagAsync(Guid projectId, string tagName)
        {
            var existing = await _tagRepository.GetByProjectIdAndNameAsync(projectId, tagName);
            if (existing is not null)
                return existing;

            var tag = new Tag(projectId, tagName);
            await _tagRepository.AddAsync(tag);
            return tag;
        }

        private async Task<ResearchPaper> GetPaperOrThrow(Guid paperId) =>
            await _paperRepository.GetByIdAsync(paperId)
                ?? throw new KeyNotFoundException("Paper not found.");

        private async Task EnsureIsProjectMemberAsync(Guid projectId, Guid userId)
        {
            var project = await _projectRepository.GetByIdAsync(projectId)
                ?? throw new KeyNotFoundException("Project not found.");

            if (!project.Members.Any(m => m.UserId == userId))
                throw new Common.ForbiddenAccessException("You are not a member of this project.");
        }

        private static PaperDto ToDto(ResearchPaper paper) => new(
            paper.Id,
            paper.ProjectId,
            paper.Title,
            paper.Authors,
            paper.Abstract,
            paper.PublicationDate,
            paper.DoiOrUrl,
            paper.PdfReference,
            paper.AddedByUserId,
            paper.CreatedAt,
            paper.Tags.Select(t => t.Name).ToList());
    }
}
    
