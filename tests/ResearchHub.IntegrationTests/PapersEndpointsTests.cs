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
            var result = await response.Content.ReadJsonAsync<AuthResult>();
            return result!.AccessToken;
        }

        private async Task<ProjectDto> CreateProjectAsync(string token, string name)
        {
            _client.DefaultRequestHeaders.Authorization = new("Bearer", token);
            var response = await _client.PostAsJsonAsync("/api/projects", new CreateProjectRequest(name, "desc"));
            return (await response.Content.ReadJsonAsync<ProjectDto>())!;
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
            var paper = await response.Content.ReadJsonAsync<PaperDto>();
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
            var papers = await response.Content.ReadJsonAsync<List<PaperDto>>();

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
        [Fact]
        public async Task Search_FindsPapersAcrossMyProjects_ButNeverFromProjectsIAmNotIn()
        {
            var tokenA = await RegisterAndGetTokenAsync("search1@example.com");
            var tokenB = await RegisterAndGetTokenAsync("search2@example.com");

            var projectA1 = await CreateProjectAsync(tokenA, "Search A1");
            var projectA2 = await CreateProjectAsync(tokenA, "Search A2");

            _client.DefaultRequestHeaders.Authorization = new("Bearer", tokenA);
            var p1 = await _client.PostAsJsonAsync($"/api/projects/{projectA1.Id}/papers",
                new CreatePaperRequest("Quantum Entanglement Basics", "Smith", "intro", null, null, null, null));
            Assert.Equal(HttpStatusCode.Created, p1.StatusCode);
            var p2 = await _client.PostAsJsonAsync($"/api/projects/{projectA2.Id}/papers",
                new CreatePaperRequest("Advanced Topics", "Jones", "covers quantum computing", null, null, null, null));
            Assert.Equal(HttpStatusCode.Created, p2.StatusCode);

            // CreateProjectAsync switches the client to user B's token, so this paper belongs to B
            var projectB = await CreateProjectAsync(tokenB, "Search B");
            var p3 = await _client.PostAsJsonAsync($"/api/projects/{projectB.Id}/papers",
                new CreatePaperRequest("Quantum Secrets", "Hidden", "private", null, null, null, null));
            Assert.Equal(HttpStatusCode.Created, p3.StatusCode);

            _client.DefaultRequestHeaders.Authorization = new("Bearer", tokenA);

            var all = await _client.GetAsync("/api/papers/search?query=quantum");
            Assert.Equal(HttpStatusCode.OK, all.StatusCode);
            var allPapers = await all.Content.ReadJsonAsync<List<PaperDto>>();
            Assert.Equal(2, allPapers!.Count);
            Assert.DoesNotContain(allPapers, p => p.Title == "Quantum Secrets");

            // every word must match somewhere: only the second paper has both words
            var both = await _client.GetAsync("/api/papers/search?query=quantum%20computing");
            var bothPapers = await both.Content.ReadJsonAsync<List<PaperDto>>();
            Assert.Equal("Advanced Topics", Assert.Single(bothPapers!).Title);
        }

        [Fact]
        public async Task Search_WithProjectId_OnlySearchesThatProject()
        {
            var token = await RegisterAndGetTokenAsync("search3@example.com");
            var projectOne = await CreateProjectAsync(token, "Scoped One");
            var projectTwo = await CreateProjectAsync(token, "Scoped Two");

            _client.DefaultRequestHeaders.Authorization = new("Bearer", token);
            var a = await _client.PostAsJsonAsync($"/api/projects/{projectOne.Id}/papers",
                new CreatePaperRequest("Graph Theory", "Euler", "bridges", null, null, null, null));
            Assert.Equal(HttpStatusCode.Created, a.StatusCode);
            var b = await _client.PostAsJsonAsync($"/api/projects/{projectTwo.Id}/papers",
                new CreatePaperRequest("Graph Neural Networks", "Kipf", "learning", null, null, null, null));
            Assert.Equal(HttpStatusCode.Created, b.StatusCode);

            var response = await _client.GetAsync($"/api/papers/search?query=graph&projectId={projectTwo.Id}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var papers = await response.Content.ReadJsonAsync<List<PaperDto>>();
            Assert.Equal("Graph Neural Networks", Assert.Single(papers!).Title);
        }

        [Fact]
        public async Task Search_WithoutQuery_Returns400WithFieldError()
        {
            var token = await RegisterAndGetTokenAsync("search4@example.com");
            _client.DefaultRequestHeaders.Authorization = new("Bearer", token);

            var response = await _client.GetAsync("/api/papers/search");

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var body = await response.Content.ReadAsStringAsync();
            Assert.Contains("\"query\"", body);
        }
        [Fact]
        public async Task RemoveTag_UsingIdFromPaperResponse_RemovesOnlyThatTag()
        {
            var token = await RegisterAndGetTokenAsync("tagremove1@example.com");
            var project = await CreateProjectAsync(token, "Tag Removal");

            _client.DefaultRequestHeaders.Authorization = new("Bearer", token);
            var created = await _client.PostAsJsonAsync($"/api/projects/{project.Id}/papers",
                new CreatePaperRequest("Title", "Authors", "abstract", null, null, null, new[] { "vision", "survey" }));
            Assert.Equal(HttpStatusCode.Created, created.StatusCode);
            var paper = await created.Content.ReadJsonAsync<PaperDto>();

            var vision = paper!.Tags.Single(t => t.Name == "vision");

            var response = await _client.DeleteAsync($"/api/papers/{paper.Id}/tags/{vision.Id}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var updated = await response.Content.ReadJsonAsync<PaperDto>();
            Assert.Equal("survey", Assert.Single(updated!.Tags).Name);
        }
    }
}