using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Net;
using System.Net.Http.Json;
using ResearchHub.Application.Auth;
using ResearchHub.Application.Papers;
using ResearchHub.Application.Projects;
using Xunit;

namespace ResearchHub.IntegrationTests
{
    public class PapersEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public PapersEndpointsTests(CustomWebApplicationFactory factory)
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

        private async Task<ProjectDto> CreateProjectAsync(string token, string name)
        {
            _client.DefaultRequestHeaders.Authorization = new("Bearer", token);
            var response = await _client.PostAsJsonAsync("/api/projects", new CreateProjectRequest(name, "desc"));
            return (await response.Content.ReadFromJsonAsync<ProjectDto>())!;
        }

        [Fact]
        public async Task CreatePaper_WithTags_ReturnsPaperWithTagsAttached()
        {
            var token = await RegisterAndGetTokenAsync("paperowner1@example.com");
            var project = await CreateProjectAsync(token, "AI Research");

            var response = await _client.PostAsJsonAsync($"/api/projects/{project.Id}/papers",
                new CreatePaperRequest("Attention Is All You Need", "Vaswani et al.", "abstract",
                    new DateTime(2017, 6, 12), null, null, new[] { "transformers", "nlp" }));

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var paper = await response.Content.ReadFromJsonAsync<PaperDto>();
            Assert.Equal(2, paper!.Tags.Count);
        }

        [Fact]
        public async Task FilterPapers_ByTag_ReturnsOnlyMatchingPapers()
        {
            var token = await RegisterAndGetTokenAsync("paperowner2@example.com");
            var project = await CreateProjectAsync(token, "AI Research");

            await _client.PostAsJsonAsync($"/api/projects/{project.Id}/papers",
                new CreatePaperRequest("Paper A", "Author A", "abstract", null, null, null, new[] { "vision" }));
            await _client.PostAsJsonAsync($"/api/projects/{project.Id}/papers",
                new CreatePaperRequest("Paper B", "Author B", "abstract", null, null, null, new[] { "nlp" }));

            var response = await _client.GetAsync($"/api/projects/{project.Id}/papers?tag=vision");
            var papers = await response.Content.ReadFromJsonAsync<List<PaperDto>>();

            Assert.Single(papers!);
            Assert.Equal("Paper A", papers![0].Title);
        }

        [Fact]
        public async Task NonMember_CannotAddPaperToProject_Returns403()
        {
            var ownerToken = await RegisterAndGetTokenAsync("paperowner3@example.com");
            var project = await CreateProjectAsync(ownerToken, "Private Project");

            var outsiderToken = await RegisterAndGetTokenAsync("outsider2@example.com");
            _client.DefaultRequestHeaders.Authorization = new("Bearer", outsiderToken);

            var response = await _client.PostAsJsonAsync($"/api/projects/{project.Id}/papers",
                new CreatePaperRequest("Title", "Authors", "abstract", null, null, null, null));

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }
}