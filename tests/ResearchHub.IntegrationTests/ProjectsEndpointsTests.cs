using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Net;
using System.Net.Http.Json;
using ResearchHub.Application.Auth;
using ResearchHub.Application.Projects;
using Xunit;
using System.Text;
namespace ResearchHub.IntegrationTests
{
    public class ProjectsEndpointsTests: IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;
        public ProjectsEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }
        private async Task<string> RegisterAndGetTokenAsync(string email)
        {
            var response = await _client.PostAsJsonAsync("/api/auth/register",
                new RegisterRequest(email, "Test User", "SecurePass123!"));

            var result = await response.Content.ReadFromJsonAsync<AuthResult>();
            return result!.AccessToken;
        }
        [Fact]
        public async Task CreateProject_Authenticated_Returns201WithOwnerAsMember()
        {
            var token = await RegisterAndGetTokenAsync("owner1@example.com");
            _client.DefaultRequestHeaders.Authorization = new("Bearer", token);

            var response = await _client.PostAsJsonAsync("/api/projects",
                new CreateProjectRequest("AI Research", "desc"));

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            var project = await response.Content.ReadFromJsonAsync<ProjectDto>();
            Assert.Single(project!.Members);
        }
        [Fact]
        public async Task CreateProject_NoToken_Returns401()
        {
            using var unauthenticatedClient = new CustomWebApplicationFactory().CreateClient();

            var response = await unauthenticatedClient.PostAsJsonAsync("/api/projects",
                new CreateProjectRequest("AI Research", "desc"));

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }
        [Fact]
        public async Task GetProject_NonMember_Returns403()
        {
            var ownerToken = await RegisterAndGetTokenAsync("owner2@example.com");
            _client.DefaultRequestHeaders.Authorization = new("Bearer", ownerToken);

            var createResponse = await _client.PostAsJsonAsync("/api/projects",
                new CreateProjectRequest("Private Project", "desc"));
            var project = await createResponse.Content.ReadFromJsonAsync<ProjectDto>();

            var outsiderToken = await RegisterAndGetTokenAsync("outsider@example.com");
            _client.DefaultRequestHeaders.Authorization = new("Bearer", outsiderToken);

            var response = await _client.GetAsync($"/api/projects/{project!.Id}");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
        [Fact]
        public async Task GetProject_NonExistentId_Returns404()
        {
            var token = await RegisterAndGetTokenAsync("owner3@example.com");
            _client.DefaultRequestHeaders.Authorization = new("Bearer", token);

            var response = await _client.GetAsync($"/api/projects/{Guid.NewGuid()}");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
        [Fact]
        public async Task AddMember_ThenNonOwnerCannotDelete_Returns403()
        {
        // Owner creates a project
            var ownerToken = await RegisterAndGetTokenAsync("owner4@example.com");
            _client.DefaultRequestHeaders.Authorization = new("Bearer", ownerToken);

            var createResponse = await _client.PostAsJsonAsync("/api/projects",
                new CreateProjectRequest("Shared Project", "desc"));
            Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
            var project = await createResponse.Content.ReadFromJsonAsync<ProjectDto>();

            // Second user registers; look up their id via /me
            var memberToken = await RegisterAndGetTokenAsync("member1@example.com");
            _client.DefaultRequestHeaders.Authorization = new("Bearer", memberToken);
            var meResponse = await _client.GetAsync("/api/auth/me");
            var me = await meResponse.Content.ReadFromJsonAsync<Dictionary<string, string>>();
            var memberId = Guid.Parse(me!["userId"]);

            // Owner adds the member (this is the step that was silently failing before)
            _client.DefaultRequestHeaders.Authorization = new("Bearer", ownerToken);
            var addResponse = await _client.PostAsJsonAsync($"/api/projects/{project!.Id}/members",
                new AddMemberRequest(memberId, ResearchHub.Domain.Enums.ProjectRole.Member));
            Assert.Equal(HttpStatusCode.OK, addResponse.StatusCode);

            // Member (not owner) tries to delete the project
            _client.DefaultRequestHeaders.Authorization = new("Bearer", memberToken);
            var deleteResponse = await _client.DeleteAsync($"/api/projects/{project.Id}");

            Assert.Equal(HttpStatusCode.Forbidden, deleteResponse.StatusCode);
        }
        [Fact]
        public async Task CreateProject_WithEmptyName_Returns400WithFieldErrors()
        {
            var token = await RegisterAndGetTokenAsync("validation1@example.com");
            _client.DefaultRequestHeaders.Authorization = new("Bearer", token);

            var response = await _client.PostAsJsonAsync("/api/projects", new CreateProjectRequest("", "desc"));

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var body = await response.Content.ReadAsStringAsync();
            Assert.Contains("\"name\"", body);
        }
        [Fact]
        public async Task CreateProject_WithMalformedJson_Returns400InSameShape()
        {
            var token = await RegisterAndGetTokenAsync("validation2@example.com");
            _client.DefaultRequestHeaders.Authorization = new("Bearer", token);

            var content = new StringContent("{ this is not valid json", Encoding.UTF8, "application/json");
            var response = await _client.PostAsync("/api/projects", content);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var body = await response.Content.ReadAsStringAsync();
            Assert.Contains("Validation failed", body);
            Assert.Contains("traceId", body);
        }
        [Fact]
        public async Task GetMyProjects_ReturnsOnlyProjectsTheUserBelongsTo()
        {
            var tokenA = await RegisterAndGetTokenAsync("mine1@example.com");
            var tokenB = await RegisterAndGetTokenAsync("mine2@example.com");

            _client.DefaultRequestHeaders.Authorization = new("Bearer", tokenA);
            var a1 = await _client.PostAsJsonAsync("/api/projects", new CreateProjectRequest("A One", "desc"));
            Assert.Equal(HttpStatusCode.Created, a1.StatusCode);
            var a2 = await _client.PostAsJsonAsync("/api/projects", new CreateProjectRequest("A Two", "desc"));
            Assert.Equal(HttpStatusCode.Created, a2.StatusCode);

            _client.DefaultRequestHeaders.Authorization = new("Bearer", tokenB);
            var b1 = await _client.PostAsJsonAsync("/api/projects", new CreateProjectRequest("B One", "desc"));
            Assert.Equal(HttpStatusCode.Created, b1.StatusCode);

            _client.DefaultRequestHeaders.Authorization = new("Bearer", tokenA);
            var response = await _client.GetAsync("/api/projects");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var projects = await response.Content.ReadFromJsonAsync<List<ProjectSummaryDto>>();
            Assert.Equal(2, projects!.Count);
            Assert.All(projects, p => Assert.Equal(ResearchHub.Domain.Enums.ProjectRole.Owner, p.MyRole));
            Assert.DoesNotContain(projects, p => p.Name == "B One");
        }
        [Fact]
        public async Task CreateProject_ResponseIncludesOwnerDisplayName()
        {
            var token = await RegisterAndGetTokenAsync("names1@example.com");
            _client.DefaultRequestHeaders.Authorization = new("Bearer", token);

            var response = await _client.PostAsJsonAsync("/api/projects", new CreateProjectRequest("Named Project", "desc"));
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            var project = await response.Content.ReadFromJsonAsync<ProjectDto>();
            Assert.Equal("Test User", project!.Members.Single().DisplayName);
        }
    }
}