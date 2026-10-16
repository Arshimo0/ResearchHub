using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Moq;
using ResearchHub.Application.Common;
using ResearchHub.Application.ResearchTasks;
using ResearchHub.Domain.Entities;
using ResearchHub.Domain.Enums;
using Xunit;

namespace ResearchHub.UnitTests.ResearchTasks;

public class ResearchTaskServiceTests
{
    private readonly Mock<IResearchTaskRepository> _taskRepository = new();
    private readonly Mock<IPaperRepository> _paperRepository = new();
    private readonly Mock<IProjectRepository> _projectRepository = new();
    private readonly Mock<IUnitOfWork> _unitOfWork = new();
    private readonly ResearchTaskService _sut;

    public ResearchTaskServiceTests()
    {
        _sut = new ResearchTaskService(
            _taskRepository.Object,
            _paperRepository.Object,
            _projectRepository.Object,
            _unitOfWork.Object,
            new CreateResearchTaskRequestValidator(),
            new UpdateResearchTaskRequestValidator(),
            new ChangeResearchTaskStatusRequestValidator());
    }

    // A project with one Owner and two regular Members
    private (ResearchProject Project, Guid OwnerId, Guid MemberId, Guid OtherMemberId) CreateProject()
    {
        var ownerId = Guid.NewGuid();
        var memberId = Guid.NewGuid();
        var otherMemberId = Guid.NewGuid();

        var project = new ResearchProject("AI Research", "desc", ownerId);
        project.AddMember(memberId, ProjectRole.Member);
        project.AddMember(otherMemberId, ProjectRole.Member);

        _projectRepository.Setup(r => r.GetByIdAsync(project.Id)).ReturnsAsync(project);

        return (project, ownerId, memberId, otherMemberId);
    }

    private ResearchTask CreateTask(Guid projectId, Guid createdBy, Guid? assignedTo = null)
    {
        var task = new ResearchTask(projectId, "Read paper", "desc", TaskPriority.Medium, createdBy);
        if (assignedTo.HasValue)
            task.AssignTo(assignedTo.Value);

        _taskRepository.Setup(r => r.GetByIdAsync(task.Id)).ReturnsAsync(task);
        return task;
    }

    [Fact]
    public async Task CreateAsync_Member_CreatesTask()
    {
        var (project, _, memberId, _) = CreateProject();

        var result = await _sut.CreateAsync(project.Id,
            new CreateResearchTaskRequest("Read paper", "desc", TaskPriority.High, null, null, null), memberId);

        Assert.Equal("Read paper", result.Title);
        Assert.Equal(memberId, result.CreatedByUserId);
        Assert.Equal(ResearchTaskStatus.Todo, result.Status);
        _taskRepository.Verify(r => r.AddAsync(It.IsAny<ResearchTask>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_NonMember_ThrowsForbiddenAccessException()
    {
        var (project, _, _, _) = CreateProject();

        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            _sut.CreateAsync(project.Id,
                new CreateResearchTaskRequest("Title", "desc", TaskPriority.Low, null, null, null), Guid.NewGuid()));
    }

    [Fact]
    public async Task CreateAsync_AssigneeNotInProject_ThrowsArgumentException()
    {
        var (project, ownerId, _, _) = CreateProject();

        await Assert.ThrowsAsync<ArgumentException>(() =>
            _sut.CreateAsync(project.Id,
                new CreateResearchTaskRequest("Title", "desc", TaskPriority.Low, null, null, Guid.NewGuid()), ownerId));

        _taskRepository.Verify(r => r.AddAsync(It.IsAny<ResearchTask>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_PaperFromDifferentProject_ThrowsArgumentException()
    {
        var (project, ownerId, _, _) = CreateProject();
        var paperInOtherProject = new ResearchPaper(Guid.NewGuid(), "Title", "Authors", "abstract", null, null, null, Guid.NewGuid());
        _paperRepository.Setup(r => r.GetByIdAsync(paperInOtherProject.Id)).ReturnsAsync(paperInOtherProject);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            _sut.CreateAsync(project.Id,
                new CreateResearchTaskRequest("Title", "desc", TaskPriority.Low, null, paperInOtherProject.Id, null), ownerId));

        _taskRepository.Verify(r => r.AddAsync(It.IsAny<ResearchTask>()), Times.Never);
    }

    [Fact]
    public async Task UpdateAsync_MemberWhoIsNotCreator_ThrowsForbiddenAccessException()
    {
        var (project, _, memberId, otherMemberId) = CreateProject();
        var task = CreateTask(project.Id, createdBy: memberId);

        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            _sut.UpdateAsync(task.Id,
                new UpdateResearchTaskRequest("New title", "desc", TaskPriority.High, null), otherMemberId));
    }

    [Fact]
    public async Task UpdateAsync_OwnerWhoIsNotCreator_Succeeds()
    {
        var (project, ownerId, memberId, _) = CreateProject();
        var task = CreateTask(project.Id, createdBy: memberId);

        var result = await _sut.UpdateAsync(task.Id,
            new UpdateResearchTaskRequest("New title", "desc", TaskPriority.High, null), ownerId);

        Assert.Equal("New title", result.Title);
    }

    [Fact]
    public async Task ChangeStatusAsync_Assignee_MarksDoneAndSetsCompletedAt()
    {
        var (project, ownerId, memberId, _) = CreateProject();
        var task = CreateTask(project.Id, createdBy: ownerId, assignedTo: memberId);

        var result = await _sut.ChangeStatusAsync(task.Id,
            new ChangeResearchTaskStatusRequest(ResearchTaskStatus.Done), memberId);

        Assert.Equal(ResearchTaskStatus.Done, result.Status);
        Assert.NotNull(result.CompletedAt);
    }

    [Fact]
    public async Task ChangeStatusAsync_MemberWhoIsNotAssignee_ThrowsForbiddenAccessException()
    {
        var (project, ownerId, memberId, otherMemberId) = CreateProject();
        var task = CreateTask(project.Id, createdBy: ownerId, assignedTo: memberId);

        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            _sut.ChangeStatusAsync(task.Id,
                new ChangeResearchTaskStatusRequest(ResearchTaskStatus.Done), otherMemberId));
    }

    [Fact]
    public async Task ChangeStatusAsync_OwnerWhoIsNotAssignee_Succeeds()
    {
        var (project, ownerId, memberId, _) = CreateProject();
        var task = CreateTask(project.Id, createdBy: memberId, assignedTo: memberId);

        var result = await _sut.ChangeStatusAsync(task.Id,
            new ChangeResearchTaskStatusRequest(ResearchTaskStatus.InProgress), ownerId);

        Assert.Equal(ResearchTaskStatus.InProgress, result.Status);
    }

    [Fact]
    public async Task AssignAsync_NullUserId_UnassignsTask()
    {
        var (project, ownerId, memberId, _) = CreateProject();
        var task = CreateTask(project.Id, createdBy: ownerId, assignedTo: memberId);

        var result = await _sut.AssignAsync(task.Id, new AssignResearchTaskRequest(null), ownerId);

        Assert.Null(result.AssignedToUserId);
    }
    [Fact]
    public async Task CreateAsync_UndefinedPriorityValue_ThrowsValidationException()
    {
        var request = new CreateResearchTaskRequest("Title", "desc", (TaskPriority)99, null, null, null);

        var ex = await Assert.ThrowsAsync<RequestValidationException>(() =>
            _sut.CreateAsync(Guid.NewGuid(), request, Guid.NewGuid()));

        Assert.Contains("priority", ex.Errors.Keys);
        _taskRepository.Verify(r => r.AddAsync(It.IsAny<ResearchTask>()), Times.Never);
    }
}