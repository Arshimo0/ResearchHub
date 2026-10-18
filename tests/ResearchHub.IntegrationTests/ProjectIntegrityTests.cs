using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ResearchHub.Application.Auth;
using ResearchHub.Application.Notes;
using ResearchHub.Application.Papers;
using ResearchHub.Application.Projects;
using ResearchHub.Application.ResearchTasks;
using ResearchHub.Domain.Entities;
using ResearchHub.Domain.Enums;
using ResearchHub.Infrastructure.Persistence;
using Xunit;

namespace ResearchHub.IntegrationTests;

public class ProjectIntegrityTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public ProjectIntegrityTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<AuthResult> RegisterAsync(string email)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(email, "Integrity Tester", "SecurePass123!"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var auth = (await response.Content.ReadJsonAsync<AuthResult>())!;
        _client.DefaultRequestHeaders.Authorization = new("Bearer", auth.AccessToken);
        return auth;
    }

    private async Task<ProjectDto> CreateProjectAsync(string name)
    {
        var response = await _client.PostAsJsonAsync("/api/projects", new CreateProjectRequest(name, "desc"));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadJsonAsync<ProjectDto>())!;
    }

    private async Task<PaperDto> CreatePaperAsync(Guid projectId, string title, string tag)
    {
        var response = await _client.PostAsJsonAsync($"/api/projects/{projectId}/papers",
            new CreatePaperRequest(title, "Authors", "abstract", null, null, null, new[] { tag }));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadJsonAsync<PaperDto>())!;
    }

    [Fact]
    public async Task DeleteProject_RemovesItsContents_AndLeavesOtherProjectsAlone()
    {
        await RegisterAsync("integrity1@example.com");

        var doomed = await CreateProjectAsync("Doomed");
        var survivor = await CreateProjectAsync("Survivor");

        var doomedPaper = await CreatePaperAsync(doomed.Id, "Doomed paper", "vision");
        var survivorPaper = await CreatePaperAsync(survivor.Id, "Survivor paper", "vision");

        var note = await _client.PostAsJsonAsync($"/api/papers/{doomedPaper.Id}/notes",
            new CreateNoteRequest("A note"));
        Assert.Equal(HttpStatusCode.Created, note.StatusCode);

        var task = await _client.PostAsJsonAsync($"/api/projects/{doomed.Id}/tasks",
            new CreateResearchTaskRequest("Read it", "desc", TaskPriority.Low, null, doomedPaper.Id, null));
        Assert.Equal(HttpStatusCode.Created, task.StatusCode);

        async Task<(int Papers, int Tags, int Tasks, int Notes)> CountsAsync(Guid projectId, Guid paperId)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ResearchHubDbContext>();

            return (
                await db.ResearchPapers.CountAsync(p => p.ProjectId == projectId),
                await db.Tags.CountAsync(t => t.ProjectId == projectId),
                await db.ResearchTasks.CountAsync(t => t.ProjectId == projectId),
                await db.Notes.CountAsync(n => n.PaperId == paperId));
        }

        // Make sure the test is not passing vacuously
        Assert.Equal((1, 1, 1, 1), await CountsAsync(doomed.Id, doomedPaper.Id));

        var delete = await _client.DeleteAsync($"/api/projects/{doomed.Id}");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        Assert.Equal((0, 0, 0, 0), await CountsAsync(doomed.Id, doomedPaper.Id));
        Assert.Equal((1, 1, 0, 0), await CountsAsync(survivor.Id, survivorPaper.Id));
    }

    [Fact]
    public async Task Database_RejectsAPaperWhoseProjectDoesNotExist()
    {
        var auth = await RegisterAsync("integrity2@example.com");

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ResearchHubDbContext>();

        db.ResearchPapers.Add(new ResearchPaper(
            Guid.NewGuid(), "Orphan", "Authors", "abstract", null, null, null, auth.User.Id));

        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task RemoveMember_LastOwner_Returns409()
    {
        var auth = await RegisterAsync("integrity3@example.com");
        var project = await CreateProjectAsync("Solo Project");

        var response = await _client.DeleteAsync($"/api/projects/{project.Id}/members/{auth.User.Id}");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("at least one owner", body);
    }
}