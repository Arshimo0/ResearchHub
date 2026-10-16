using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Application.Common;
using ResearchHub.Domain.Entities;
using FluentValidation;

namespace ResearchHub.Application.Notes
{
    public class NoteService
    {
        private readonly INoteRepository _noteRepository;
        private readonly IPaperRepository _paperRepository;
        private readonly IProjectRepository _projectRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IValidator<CreateNoteRequest> _createValidator;
        private readonly IValidator<UpdateNoteRequest> _updateValidator;

        public NoteService(
            INoteRepository noteRepository,
            IPaperRepository paperRepository,
            IProjectRepository projectRepository,
            IUnitOfWork unitOfWork,
            IValidator<CreateNoteRequest> createValidator,
            IValidator<UpdateNoteRequest> updateValidator)
        {
            _noteRepository = noteRepository;
            _paperRepository = paperRepository;
            _projectRepository = projectRepository;
            _unitOfWork = unitOfWork;
            _createValidator = createValidator;
            _updateValidator = updateValidator;
        }
        public async Task<NoteDto> CreateAsync(Guid paperId, CreateNoteRequest request, Guid currentUserId)
        {
            await _createValidator.ValidateOrThrowAsync(request);
            var paper = await GetPaperOrThrow(paperId);
            await EnsureIsProjectMemberAsync(paper.ProjectId, currentUserId);

            var note = new Note(paperId, currentUserId, request.Content);

            await _noteRepository.AddAsync(note);
            await _unitOfWork.SaveChangesAsync();

            return ToDto(note);
        }
        
        public async Task<IReadOnlyList<NoteDto>> GetByPaperIdAsync(Guid paperId, Guid currentUserId)
        {
            var paper = await GetPaperOrThrow(paperId);
            await EnsureIsProjectMemberAsync(paper.ProjectId, currentUserId);

            var notes = await _noteRepository.GetByPaperIdAsync(paperId);
            return notes.Select(ToDto).ToList();
        }
            
        public async Task<NoteDto> UpdateAsync(Guid noteId, UpdateNoteRequest request, Guid currentUserId)
        {
            await _updateValidator.ValidateOrThrowAsync(request);
            var note = await GetNoteOrThrow(noteId);
            EnsureIsAuthor(note, currentUserId);

            note.UpdateContent(request.Content);
            await _unitOfWork.SaveChangesAsync();

            return ToDto(note);
        }
        public async Task DeleteAsync(Guid noteId, Guid currentUserId)
        {
            var note = await GetNoteOrThrow(noteId);
            EnsureIsAuthor(note, currentUserId);

            _noteRepository.Remove(note);
            await _unitOfWork.SaveChangesAsync();
        }

        private async Task<ResearchPaper> GetPaperOrThrow(Guid paperId) =>
            await _paperRepository.GetByIdAsync(paperId)
                ?? throw new KeyNotFoundException("Paper not found.");

        private async Task<Note> GetNoteOrThrow(Guid noteId) =>
            await _noteRepository.GetByIdAsync(noteId)
                ?? throw new KeyNotFoundException("Note not found.");

        private async Task EnsureIsProjectMemberAsync(Guid projectId, Guid userId)
        {
            var project = await _projectRepository.GetByIdAsync(projectId)
                ?? throw new KeyNotFoundException("Project not found.");

            if (!project.Members.Any(m => m.UserId == userId))
                throw new ForbiddenAccessException("You are not a member of this project.");
        }

        private static void EnsureIsAuthor(Note note, Guid userId)
        {
            if (note.AuthorId != userId)
                throw new ForbiddenAccessException("Only the author can modify this note.");
        }

        private static NoteDto ToDto(Note note) =>
            new(note.Id, note.PaperId, note.AuthorId, note.Content, note.CreatedAt, note.UpdatedAt);
    }
}