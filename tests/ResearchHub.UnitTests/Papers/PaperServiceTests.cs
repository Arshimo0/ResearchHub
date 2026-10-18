using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Moq;
using ResearchHub.Application.Common;
using ResearchHub.Application.Papers;
using ResearchHub.Domain.Entities;
using Xunit;

namespace ResearchHub.UnitTests.Papers
{
    public class PaperServiceTests
    {
        private readonly Mock<IPaperRepository> _paperRepository = new();
        private readonly Mock<IProjectRepository> _projectRepository = new();
        private readonly Mock<ITagRepository> _tagRepository = new();
        private readonly Mock<IUnitOfWork> _unitOfWork = new();
        private readonly PaperService _sut;
        private readonly Mock<IUserRepository> _userRepository = new();
        public PaperServiceTests()
        {
            _userRepository
            .Setup(r => r.GetByIdsAsync(It.IsAny<IReadOnlyCollection<Guid>>()))
            .ReturnsAsync(new List<User>());

            _sut = new PaperService(
                _paperRepository.Object,
                _projectRepository.Object,
                _tagRepository.Object,
                _unitOfWork.Object,
                new CreatePaperRequestValidator(),
                new UpdatePaperRequestValidator(),
                new AddTagRequestValidator(),
                _userRepository.Object,
                new PaperSearchRequestValidator()
                );
        }

        private ResearchProject CreateProjectWithMember(Guid memberId)
        {
            var ownerId = Guid.NewGuid();
            var project = new ResearchProject("AI Research", "desc", ownerId);
            if (memberId != ownerId)
                project.AddMember(memberId, Domain.Enums.ProjectRole.Member);
            return project;
        }

        [Fact]
        public async Task CreateAsync_ProjectMember_CreatesPaper()
        {
            var userId = Guid.NewGuid();
            var project = CreateProjectWithMember(userId);
            _projectRepository.Setup(r => r.GetByIdAsync(project.Id)).ReturnsAsync(project);

            var request = new CreatePaperRequest("Attention Is All You Need", "Vaswani et al.", "abstract",
                new DateTime(2017, 6, 12), null, null, null);

            var result = await _sut.CreateAsync(project.Id, request, userId);

            Assert.Equal("Attention Is All You Need", result.Title);
            _paperRepository.Verify(r => r.AddAsync(It.IsAny<ResearchPaper>()), Times.Once);
        }

        [Fact]
        public async Task CreateAsync_NonMember_ThrowsForbiddenAccessException()
        {
            var project = CreateProjectWithMember(Guid.NewGuid());
            _projectRepository.Setup(r => r.GetByIdAsync(project.Id)).ReturnsAsync(project);

            var request = new CreatePaperRequest("Title", "Authors", "abstract", null, null, null, null);

            await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
                _sut.CreateAsync(project.Id, request, Guid.NewGuid())); // not a member
        }

        [Fact]
        public async Task CreateAsync_WithNewTagName_CreatesTagAndAttachesIt()
        {
            var userId = Guid.NewGuid();
            var project = CreateProjectWithMember(userId);
            _projectRepository.Setup(r => r.GetByIdAsync(project.Id)).ReturnsAsync(project);
            _tagRepository.Setup(r => r.GetByProjectIdAndNameAsync(project.Id, "computer-vision"))
                .ReturnsAsync((Tag?)null);

            var request = new CreatePaperRequest("Title", "Authors", "abstract", null, null, null,
                new[] { "computer-vision" });

            var result = await _sut.CreateAsync(project.Id, request, userId);

            Assert.Contains(result.Tags, t => t.Name == "computer-vision");
            _tagRepository.Verify(r => r.AddAsync(It.IsAny<Tag>()), Times.Once);
        }

        [Fact]
        public async Task CreateAsync_WithExistingTagName_ReusesExistingTagWithoutCreatingDuplicate()
        {
            var userId = Guid.NewGuid();
            var project = CreateProjectWithMember(userId);
            var existingTag = new Tag(project.Id, "computer-vision");
            _projectRepository.Setup(r => r.GetByIdAsync(project.Id)).ReturnsAsync(project);
            _tagRepository.Setup(r => r.GetByProjectIdAndNameAsync(project.Id, "computer-vision"))
                .ReturnsAsync(existingTag);

            var request = new CreatePaperRequest("Title", "Authors", "abstract", null, null, null,
                new[] { "computer-vision" });

            var result = await _sut.CreateAsync(project.Id, request, userId);

            Assert.Contains(result.Tags, t => t.Name == "computer-vision");
            _tagRepository.Verify(r => r.AddAsync(It.IsAny<Tag>()), Times.Never);
        }
        [Fact]
        public async Task GetByIdAsync_NonExistentPaper_ThrowsKeyNotFoundException()
        {
            _paperRepository.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((ResearchPaper?)null);

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                _sut.GetByIdAsync(Guid.NewGuid(), Guid.NewGuid()));
        }

        [Fact]
        public async Task DeleteAsync_NonMember_ThrowsForbiddenAccessException()
        {
            var project = CreateProjectWithMember(Guid.NewGuid());
            var paper = new ResearchPaper(project.Id, "Title", "Authors", "abstract", null, null, null, Guid.NewGuid());
            _paperRepository.Setup(r => r.GetByIdAsync(paper.Id)).ReturnsAsync(paper);
            _projectRepository.Setup(r => r.GetByIdAsync(project.Id)).ReturnsAsync(project);

            await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
                _sut.DeleteAsync(paper.Id, Guid.NewGuid()));

            _paperRepository.Verify(r => r.Remove(It.IsAny<ResearchPaper>()), Times.Never);
        }
        [Fact]
        public async Task CreateAsync_EmptyTitle_ThrowsValidationException()
        {
            var request = new CreatePaperRequest("", "Authors", "abstract", null, null, null, null);

            var ex = await Assert.ThrowsAsync<RequestValidationException>(() =>
                _sut.CreateAsync(Guid.NewGuid(), request, Guid.NewGuid()));

            Assert.Contains("title", ex.Errors.Keys);
            _paperRepository.Verify(r => r.AddAsync(It.IsAny<ResearchPaper>()), Times.Never);
        }

        [Fact]
        public async Task CreateAsync_TooManyTags_ThrowsValidationException()
        {
            var tags = Enumerable.Range(0, 21).Select(i => $"tag-{i}").ToArray();
            var request = new CreatePaperRequest("Title", "Authors", "abstract", null, null, null, tags);

            var ex = await Assert.ThrowsAsync<RequestValidationException>(() =>
                _sut.CreateAsync(Guid.NewGuid(), request, Guid.NewGuid()));

            Assert.Contains("tags", ex.Errors.Keys);
        }
        [Fact]
        public async Task CreateAsync_ResultIncludesAddedByName()
        {
            var user = new User("ana@example.com", "Ana", "hash");
            var project = new ResearchProject("AI Research", "desc", user.Id);
            _projectRepository.Setup(r => r.GetByIdAsync(project.Id)).ReturnsAsync(project);
            _userRepository.Setup(r => r.GetByIdsAsync(It.IsAny<IReadOnlyCollection<Guid>>()))
                .ReturnsAsync(new List<User> { user });

            var result = await _sut.CreateAsync(project.Id,
                new CreatePaperRequest("Title", "Authors", "abstract", null, null, null, null), user.Id);

            Assert.Equal("Ana", result.AddedByName);
        }
        [Fact]
        public async Task SearchAsync_BlankQuery_ThrowsValidationException()
        {
            var ex = await Assert.ThrowsAsync<RequestValidationException>(() =>
                _sut.SearchAsync(new PaperSearchRequest("  ", null), Guid.NewGuid()));

            Assert.Contains("query", ex.Errors.Keys);
        }

        [Fact]
        public async Task SearchAsync_SplitsQueryIntoTermsAndCapsThemAtFive()
        {
            var userId = Guid.NewGuid();
            _paperRepository
                .Setup(r => r.SearchAsync(userId, It.IsAny<IReadOnlyList<string>>(), It.IsAny<Guid?>(), It.IsAny<int>()))
                .ReturnsAsync(new List<ResearchPaper>());

            await _sut.SearchAsync(new PaperSearchRequest("  attention   is all you need extra words ", null), userId);

            _paperRepository.Verify(r => r.SearchAsync(
                userId,
                It.Is<IReadOnlyList<string>>(t => t.SequenceEqual(new[] { "attention", "is", "all", "you", "need" })),
                null,
                50), Times.Once);
        }
    }
}