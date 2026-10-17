using System.Net;
using System.Net.Http.Json;
using ResearchHub.Application.Auth;
using ResearchHub.Application.Users;
using Xunit;

namespace ResearchHub.IntegrationTests;

public class UsersEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public UsersEndpointsTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    private async Task<AuthResult> RegisterAsync(string email, string displayName)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(email, displayName, "SecurePass123!"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<AuthResult>())!;
    }

    [Fact]
    public async Task Lookup_ExistingUser_ReturnsIdAndDisplayName()
    {
        var caller = await RegisterAsync("lookup-caller@example.com", "Caller");
        var target = await RegisterAsync("lookup-target@example.com", "Target Person");

        _client.DefaultRequestHeaders.Authorization = new("Bearer", caller.AccessToken);
        var email = Uri.EscapeDataString("  Lookup-Target@Example.COM ");
        var response = await _client.GetAsync($"/api/users/lookup?email={email}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var user = await response.Content.ReadFromJsonAsync<UserLookupDto>();
        Assert.Equal(target.User.Id, user!.Id);
        Assert.Equal("Target Person", user.DisplayName);
    }

    [Fact]
    public async Task Lookup_UnknownEmail_Returns404()
    {
        var caller = await RegisterAsync("lookup-caller2@example.com", "Caller");

        _client.DefaultRequestHeaders.Authorization = new("Bearer", caller.AccessToken);
        var response = await _client.GetAsync("/api/users/lookup?email=nobody%40example.com");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Lookup_WithoutToken_Returns401()
    {
        var response = await _client.GetAsync("/api/users/lookup?email=anyone%40example.com");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}