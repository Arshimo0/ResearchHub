using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Moq;
using ResearchHub.Application.Common;
using ResearchHub.Application.Notes;
using ResearchHub.Domain.Entities;
using ResearchHub.Domain.Enums;
using Xunit;

namespace ResearchHub.UnitTests.Notes
{
    public class NoteServiceTests
    {
        private readonly Mock<INoteRepository> _noteRepository = new();
        private readonly Mock<IPaperRepository> _paperRepository = new();
        private readonly Mock<IProjectRepository> _projectRepository = new();
        private readonly Mock<IUnitOfWork> _unitOfWork = new();
        private readonly NoteService _sut;
        public NoteServiceTests()
        {
            _sut = new NoteService(
                _noteRepository.Object,
                _paperRepository.Object,
                _projectRepository.Object,
                _unitOfWork.Object);
        }

        [Fact]
        public async Task CreateAsync_ProjectMember_CreatesNote()
        {
            var userId = Guid.NewGuid();
            var project = new ResearchProject("AI Research", "desc", userId);
            var paper = new ResearchPaper(project.Id, "Title", "Authors", "abstract", null, null, null, userId);

            _paperRepository.Setup(r => r.GetByIdAsync(paper.Id)).ReturnsAsync(paper);
            _projectRepository.Setup(r => r.GetByIdAsync(project.Id)).ReturnsAsync(project);

            var result = await _sut.CreateAsync(paper.Id, new CreateNoteRequest("Interesting approach."), userId);

            Assert.Equal("Interesting approach.", result.Content);
            Assert.Equal(userId, result.AuthorId);
        }

        [Fact]
        public async Task CreateAsync_NonMember_ThrowsForbiddenAccessException()
        {
            var ownerId = Guid.NewGuid();
            var project = new ResearchProject("AI Research", "desc", ownerId);
            var paper = new ResearchPaper(project.Id, "Title", "Authors", "abstract", null, null, null, ownerId);

            _paperRepository.Setup(r => r.GetByIdAsync(paper.Id)).ReturnsAsync(paper);
            _projectRepository.Setup(r => r.GetByIdAsync(project.Id)).ReturnsAsync(project);

            await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
                _sut.CreateAsync(paper.Id, new CreateNoteRequest("content"), Guid.NewGuid()));
        }

        [Fact]
        public async Task UpdateAsync_Author_UpdatesSuccessfully()
        {
            var authorId = Guid.NewGuid();
            var note = new Note(Guid.NewGuid(), authorId, "Original content");
            _noteRepository.Setup(r => r.GetByIdAsync(note.Id)).ReturnsAsync(note);

            var result = await _sut.UpdateAsync(note.Id, new UpdateNoteRequest("Revised content"), authorId);

            Assert.Equal("Revised content", result.Content);
        }

        [Fact]
        public async Task UpdateAsync_DifferentProjectMember_ThrowsForbiddenAccessException()
        {
            var authorId = Guid.NewGuid();
            var note = new Note(Guid.NewGuid(), authorId, "Original content");
            _noteRepository.Setup(r => r.GetByIdAsync(note.Id)).ReturnsAsync(note);

            await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
                _sut.UpdateAsync(note.Id, new UpdateNoteRequest("Hijacked"), Guid.NewGuid()));
        }

        [Fact]
        public async Task UpdateAsync_ProjectOwnerWhoIsNotAuthor_ThrowsForbiddenAccessException()
        {
            // This is the rule that's stricter than everywhere else in the app:
            // being the project Owner does NOT grant edit rights over another member's note.
            var ownerId = Guid.NewGuid();
            var memberId = Guid.NewGuid();
            var note = new Note(Guid.NewGuid(), memberId, "Member's note"); // authored by the member, not the owner

            _noteRepository.Setup(r => r.GetByIdAsync(note.Id)).ReturnsAsync(note);

            await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
                _sut.UpdateAsync(note.Id, new UpdateNoteRequest("Owner trying to edit"), ownerId));
        }

        [Fact]
        public async Task DeleteAsync_NonAuthor_ThrowsForbiddenAccessException()
        {
            var authorId = Guid.NewGuid();
            var note = new Note(Guid.NewGuid(), authorId, "content");
            _noteRepository.Setup(r => r.GetByIdAsync(note.Id)).ReturnsAsync(note);

            await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
                _sut.DeleteAsync(note.Id, Guid.NewGuid()));

            _noteRepository.Verify(r => r.Remove(It.IsAny<Note>()), Times.Never);
        }
    }
}