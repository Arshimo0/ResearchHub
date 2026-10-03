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

        public PaperServiceTests()
        {
            _sut = new PaperService(
                _paperRepository.Object,
                _projectRepository.Object,
                _tagRepository.Object,
                _unitOfWork.Object);
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

            Assert.Contains("computer-vision", result.Tags);
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

            Assert.Contains("computer-vision", result.Tags);
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
    }
}