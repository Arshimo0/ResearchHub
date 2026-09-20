using Moq;
using ResearchHub.Application.Common;
using ResearchHub.Application.Projects;
using ResearchHub.Domain.Entities;
using ResearchHub.Domain.Enums;
using Xunit;

namespace ResearchHub.UnitTests.Projects;

public class ProjectServiceTests
{
    private readonly Mock<IProjectRepository> _projectRepository = new();
    private readonly Mock<IUnitOfWork> _unitOfWork = new();
    private readonly ProjectService _sut;

    public ProjectServiceTests()
    {
        _sut = new ProjectService(_projectRepository.Object, _unitOfWork.Object);
    }

    [Fact]
    public async Task CreateAsync_CreatesProjectWithCallerAsOwner()
    {
        var ownerId = Guid.NewGuid();

        var result = await _sut.CreateAsync(new CreateProjectRequest("AI Research", "desc"), ownerId);

        Assert.Equal("AI Research", result.Name);
        Assert.Single(result.Members);
        Assert.Equal(ownerId, result.Members.First().UserId);
        Assert.Equal(ProjectRole.Owner, result.Members.First().Role);
        _projectRepository.Verify(r => r.AddAsync(It.IsAny<ResearchProject>()), Times.Once);
    }

    [Fact]
    public async Task GetByIdAsync_NonExistentProject_ThrowsKeyNotFoundException()
    {
        _projectRepository.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((ResearchProject?)null);

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _sut.GetByIdAsync(Guid.NewGuid(), Guid.NewGuid()));
    }

    [Fact]
    public async Task GetByIdAsync_NonMember_ThrowsForbiddenAccessException()
    {
        var project = new ResearchProject("AI Research", "desc", Guid.NewGuid());
        _projectRepository.Setup(r => r.GetByIdAsync(project.Id)).ReturnsAsync(project);

        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            _sut.GetByIdAsync(project.Id, Guid.NewGuid())); // random user, not a member
    }

    [Fact]
    public async Task GetByIdAsync_Member_ReturnsProject()
    {
        var ownerId = Guid.NewGuid();
        var project = new ResearchProject("AI Research", "desc", ownerId);
        _projectRepository.Setup(r => r.GetByIdAsync(project.Id)).ReturnsAsync(project);

        var result = await _sut.GetByIdAsync(project.Id, ownerId);

        Assert.Equal(project.Id, result.Id);
    }

    [Fact]
    public async Task UpdateAsync_NonOwnerMember_ThrowsForbiddenAccessException()
    {
        var ownerId = Guid.NewGuid();
        var memberId = Guid.NewGuid();
        var project = new ResearchProject("AI Research", "desc", ownerId);
        project.AddMember(memberId, ProjectRole.Member);
        _projectRepository.Setup(r => r.GetByIdAsync(project.Id)).ReturnsAsync(project);

        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            _sut.UpdateAsync(project.Id, new UpdateProjectRequest("New Name", "New desc"), memberId));
    }

    [Fact]
    public async Task UpdateAsync_Owner_UpdatesSuccessfully()
    {
        var ownerId = Guid.NewGuid();
        var project = new ResearchProject("AI Research", "desc", ownerId);
        _projectRepository.Setup(r => r.GetByIdAsync(project.Id)).ReturnsAsync(project);

        var result = await _sut.UpdateAsync(project.Id, new UpdateProjectRequest("New Name", "New desc"), ownerId);

        Assert.Equal("New Name", result.Name);
    }

    [Fact]
    public async Task DeleteAsync_NonOwner_ThrowsForbiddenAccessException()
    {
        var ownerId = Guid.NewGuid();
        var memberId = Guid.NewGuid();
        var project = new ResearchProject("AI Research", "desc", ownerId);
        project.AddMember(memberId, ProjectRole.Member);
        _projectRepository.Setup(r => r.GetByIdAsync(project.Id)).ReturnsAsync(project);

        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            _sut.DeleteAsync(project.Id, memberId));

        _projectRepository.Verify(r => r.Remove(It.IsAny<ResearchProject>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_Owner_RemovesProject()
    {
        var ownerId = Guid.NewGuid();
        var project = new ResearchProject("AI Research", "desc", ownerId);
        _projectRepository.Setup(r => r.GetByIdAsync(project.Id)).ReturnsAsync(project);

        await _sut.DeleteAsync(project.Id, ownerId);

        _projectRepository.Verify(r => r.Remove(project), Times.Once);
    }

    [Fact]
    public async Task AddMemberAsync_NonOwner_ThrowsForbiddenAccessException()
    {
        var ownerId = Guid.NewGuid();
        var memberId = Guid.NewGuid();
        var project = new ResearchProject("AI Research", "desc", ownerId);
        project.AddMember(memberId, ProjectRole.Member);
        _projectRepository.Setup(r => r.GetByIdAsync(project.Id)).ReturnsAsync(project);

        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            _sut.AddMemberAsync(project.Id, new AddMemberRequest(Guid.NewGuid(), ProjectRole.Member), memberId));
    }

    [Fact]
    public async Task RemoveMemberAsync_LastOwner_PropagatesDomainException()
    {
        var ownerId = Guid.NewGuid();
        var project = new ResearchProject("AI Research", "desc", ownerId);
        _projectRepository.Setup(r => r.GetByIdAsync(project.Id)).ReturnsAsync(project);

        await Assert.ThrowsAsync<ResearchHub.Domain.Exceptions.CannotRemoveLastOwnerException>(() =>
            _sut.RemoveMemberAsync(project.Id, ownerId, ownerId));
    }
}