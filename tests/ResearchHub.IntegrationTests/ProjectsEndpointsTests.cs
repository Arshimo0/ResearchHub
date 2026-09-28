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
            var ownerToken = await RegisterAndGetTokenAsync("owner4@example.com");
            _client.DefaultRequestHeaders.Authorization = new("Bearer", ownerToken);

            var createResponse = await _client.PostAsJsonAsync("/api/projects",
                new CreateProjectRequest("Shared Project", "desc"));
            var project = await createResponse.Content.ReadFromJsonAsync<ProjectDto>();

            var meResponse = await _client.GetAsync("/api/auth/me");
            // registering the second user separately to get their id
            using var registerResponse = await _client.PostAsJsonAsync("/api/auth/register",
                new RegisterRequest("member1@example.com", "Member User", "SecurePass123!"));
            var memberAuth = await registerResponse.Content.ReadFromJsonAsync<AuthResult>();

            // fetch member's id via /me using their own token
            _client.DefaultRequestHeaders.Authorization = new("Bearer", memberAuth!.AccessToken);
            var memberMeResponse = await _client.GetAsync("/api/auth/me");
            var memberMeJson = await memberMeResponse.Content.ReadFromJsonAsync<Dictionary<string, string>>();
            var memberId = Guid.Parse(memberMeJson!["userId"]);

            // back to owner to add the member
            _client.DefaultRequestHeaders.Authorization = new("Bearer", ownerToken);
            await _client.PostAsJsonAsync($"/api/projects/{project!.Id}/members",
                new AddMemberRequest(memberId, ResearchHub.Domain.Enums.ProjectRole.Member));

            // member tries to delete the project — should be forbidden
            _client.DefaultRequestHeaders.Authorization = new("Bearer", memberAuth.AccessToken);
            var deleteResponse = await _client.DeleteAsync($"/api/projects/{project.Id}");

            Assert.Equal(HttpStatusCode.Forbidden, deleteResponse.StatusCode);
        }
    }
}