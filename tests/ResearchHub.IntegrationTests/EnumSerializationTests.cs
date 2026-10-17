using System.Net;
using System.Net.Http.Json;
using System.Text;
using ResearchHub.Application.Auth;
using ResearchHub.Application.Projects;
using Xunit;

namespace ResearchHub.IntegrationTests;

public class EnumSerializationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public EnumSerializationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    private async Task RegisterAsync(string email)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(email, "Enum Tester", "SecurePass123!"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = await response.Content.ReadJsonAsync<AuthResult>();
        _client.DefaultRequestHeaders.Authorization = new("Bearer", auth!.AccessToken);
    }

    private async Task<ProjectDto> CreateProjectAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/projects", new CreateProjectRequest("Enum Project", "desc"));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadJsonAsync<ProjectDto>())!;
    }

    private static StringContent Json(string json) => new(json, Encoding.UTF8, "application/json");

    [Fact]
    public async Task Responses_WriteEnumsAsNames()
    {
        await RegisterAsync("enums1@example.com");

        var response = await _client.PostAsJsonAsync("/api/projects", new CreateProjectRequest("Enum Project", "desc"));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"status\":\"Active\"", body);
        Assert.Contains("\"role\":\"Owner\"", body);
    }

    [Fact]
    public async Task Requests_AcceptEnumNames()
    {
        await RegisterAsync("enums2@example.com");
        var project = await CreateProjectAsync();

        var response = await _client.PostAsync($"/api/projects/{project.Id}/tasks",
            Json("{\"title\":\"Read paper\",\"description\":\"desc\",\"priority\":\"High\"}"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"priority\":\"High\"", body);
        Assert.Contains("\"status\":\"Todo\"", body);
    }

    [Fact]
    public async Task Requests_WithUnknownEnumName_Return400()
    {
        await RegisterAsync("enums3@example.com");
        var project = await CreateProjectAsync();

        var response = await _client.PostAsync($"/api/projects/{project.Id}/tasks",
            Json("{\"title\":\"Read paper\",\"description\":\"desc\",\"priority\":\"Urgent\"}"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Validation failed", body);
    }
}