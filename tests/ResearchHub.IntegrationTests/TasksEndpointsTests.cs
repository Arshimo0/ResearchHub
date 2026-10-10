using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Net;
using System.Net.Http.Json;
using ResearchHub.Application.Auth;
using ResearchHub.Application.Papers;
using ResearchHub.Application.Projects;
using ResearchHub.Application.ResearchTasks;
using ResearchHub.Domain.Enums;
using Xunit;

namespace ResearchHub.IntegrationTests;

public class TasksEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public TasksEndpointsTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    private void Authenticate(string token) =>
        _client.DefaultRequestHeaders.Authorization = new("Bearer", token);

    private async Task<(string Token, Guid UserId)> RegisterAsync(string email)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(email, "Test User", "SecurePass123!"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<AuthResult>();

        Authenticate(result!.AccessToken);
        var meResponse = await _client.GetAsync("/api/auth/me");
        var me = await meResponse.Content.ReadFromJsonAsync<Dictionary<string, string>>();

        return (result.AccessToken, Guid.Parse(me!["userId"]));
    }

    private async Task<ProjectDto> CreateProjectAsync(string ownerToken, string name)
    {
        Authenticate(ownerToken);
        var response = await _client.PostAsJsonAsync("/api/projects", new CreateProjectRequest(name, "desc"));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ProjectDto>())!;
    }

    private async Task AddMemberAsync(string ownerToken, Guid projectId, Guid userId)
    {
        Authenticate(ownerToken);
        var response = await _client.PostAsJsonAsync($"/api/projects/{projectId}/members",
            new AddMemberRequest(userId, ProjectRole.Member));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task OnlyAssigneeOrOwner_CanChangeStatus_AndDoneSetsCompletedAt()
    {
        var (ownerToken, _) = await RegisterAsync("taskowner1@example.com");
        var (assigneeToken, assigneeId) = await RegisterAsync("assignee1@example.com");
        var (otherToken, otherId) = await RegisterAsync("othermember1@example.com");

        var project = await CreateProjectAsync(ownerToken, "Task Project");
        await AddMemberAsync(ownerToken, project.Id, assigneeId);
        await AddMemberAsync(ownerToken, project.Id, otherId);

        Authenticate(ownerToken);
        var createResponse = await _client.PostAsJsonAsync($"/api/projects/{project.Id}/tasks",
            new CreateResearchTaskRequest("Read paper", "desc", TaskPriority.High, null, null, assigneeId));
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var task = await createResponse.Content.ReadFromJsonAsync<ResearchTaskDto>();

        // A member who is not the assignee is rejected
        Authenticate(otherToken);
        var forbidden = await _client.PatchAsJsonAsync($"/api/tasks/{task!.Id}/status",
            new ChangeResearchTaskStatusRequest(ResearchTaskStatus.Done));
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        // The assignee succeeds, and CompletedAt is populated
        Authenticate(assigneeToken);
        var ok = await _client.PatchAsJsonAsync($"/api/tasks/{task.Id}/status",
            new ChangeResearchTaskStatusRequest(ResearchTaskStatus.Done));
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);

        var updated = await ok.Content.ReadFromJsonAsync<ResearchTaskDto>();
        Assert.Equal(ResearchTaskStatus.Done, updated!.Status);
        Assert.NotNull(updated.CompletedAt);
    }

    [Fact]
    public async Task CreateTask_AssignedToNonMember_Returns400()
    {
        var (ownerToken, _) = await RegisterAsync("taskowner2@example.com");
        var (_, outsiderId) = await RegisterAsync("outsider3@example.com");

        var project = await CreateProjectAsync(ownerToken, "Task Project");

        Authenticate(ownerToken);
        var response = await _client.PostAsJsonAsync($"/api/projects/{project.Id}/tasks",
            new CreateResearchTaskRequest("Title", "desc", TaskPriority.Low, null, null, outsiderId));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateTask_LinkedToPaperFromAnotherProject_Returns400()
    {
        var (ownerToken, _) = await RegisterAsync("taskowner3@example.com");

        var projectA = await CreateProjectAsync(ownerToken, "Project A");
        var projectB = await CreateProjectAsync(ownerToken, "Project B");

        Authenticate(ownerToken);
        var paperResponse = await _client.PostAsJsonAsync($"/api/projects/{projectB.Id}/papers",
            new CreatePaperRequest("Paper in B", "Authors", "abstract", null, null, null, null));
        Assert.Equal(HttpStatusCode.Created, paperResponse.StatusCode);
        var paperInB = await paperResponse.Content.ReadFromJsonAsync<PaperDto>();

        var response = await _client.PostAsJsonAsync($"/api/projects/{projectA.Id}/tasks",
            new CreateResearchTaskRequest("Title", "desc", TaskPriority.Low, null, paperInB!.Id, null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}