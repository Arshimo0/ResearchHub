using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Net;
using System.Net.Http.Json;
using ResearchHub.Application.Auth;
using ResearchHub.Application.Projects;
using Xunit;
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
    }
}