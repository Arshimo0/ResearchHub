using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Net;
using System.Net.Http.Json;
using ResearchHub.Application.Auth;
using ResearchHub.Application.Notes;
using ResearchHub.Application.Papers;
using ResearchHub.Application.Projects;
using Xunit;

namespace ResearchHub.IntegrationTests
{
    public class NotesEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public NotesEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        private async Task<(string Token, string UserId)> RegisterAsync(string email)
        {
            var response = await _client.PostAsJsonAsync("/api/auth/register",
                new RegisterRequest(email, "Test User", "SecurePass123!"));
            var result = await response.Content.ReadFromJsonAsync<AuthResult>();

            _client.DefaultRequestHeaders.Authorization = new("Bearer", result!.AccessToken);
            var meResponse = await _client.GetAsync("/api/auth/me");
            var me = await meResponse.Content.ReadFromJsonAsync<Dictionary<string, string>>();

            return (result.AccessToken, me!["userId"]);
        }

        [Fact]
        public async Task OwnerCannotEditAnotherMembersNote_Returns403()
        {
            var (ownerToken, ownerId) = await RegisterAsync("noteowner1@example.com");
            _client.DefaultRequestHeaders.Authorization = new("Bearer", ownerToken);

            var projectResponse = await _client.PostAsJsonAsync("/api/projects",
                new CreateProjectRequest("Shared Project", "desc"));
            var project = await projectResponse.Content.ReadFromJsonAsync<ProjectDto>();

            var paperResponse = await _client.PostAsJsonAsync($"/api/projects/{project!.Id}/papers",
                new CreatePaperRequest("Title", "Authors", "abstract", null, null, null, null));
            var paper = await paperResponse.Content.ReadFromJsonAsync<PaperDto>();

            var (memberToken, memberId) = await RegisterAsync("notemember1@example.com");

            _client.DefaultRequestHeaders.Authorization = new("Bearer", ownerToken);
            var addMemberResponse = await _client.PostAsJsonAsync($"/api/projects/{project.Id}/members",
                new AddMemberRequest(Guid.Parse(memberId), ResearchHub.Domain.Enums.ProjectRole.Member));

            if (!addMemberResponse.IsSuccessStatusCode)
            {
                var errorBody = await addMemberResponse.Content.ReadAsStringAsync();
                throw new Exception($"AddMember failed with {addMemberResponse.StatusCode}: {errorBody}");
            }
            Assert.Equal(HttpStatusCode.OK, addMemberResponse.StatusCode);

            _client.DefaultRequestHeaders.Authorization = new("Bearer", memberToken);
            var noteResponse = await _client.PostAsJsonAsync($"/api/papers/{paper!.Id}/notes",
                new CreateNoteRequest("Member's note"));
            Assert.Equal(HttpStatusCode.Created, noteResponse.StatusCode);
            var note = await noteResponse.Content.ReadFromJsonAsync<NoteDto>();

            _client.DefaultRequestHeaders.Authorization = new("Bearer", ownerToken);
            var updateResponse = await _client.PutAsJsonAsync($"/api/notes/{note!.Id}",
                new UpdateNoteRequest("Owner overriding"));

            Assert.Equal(HttpStatusCode.Forbidden, updateResponse.StatusCode);
        }
    }
}