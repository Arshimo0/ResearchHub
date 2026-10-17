using System.Net;
using Xunit;

namespace ResearchHub.IntegrationTests;

public class CorsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public CorsTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task AllowedOrigin_GetsCorsHeader()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        request.Headers.Add("Origin", "http://localhost:5173");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("http://localhost:5173",
            response.Headers.GetValues("Access-Control-Allow-Origin").Single());
    }

    [Fact]
    public async Task UnknownOrigin_GetsNoCorsHeader()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        request.Headers.Add("Origin", "https://evil.example");

        var response = await _client.SendAsync(request);

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task Preflight_FromAllowedOrigin_IsApproved()
    {
        var request = new HttpRequestMessage(HttpMethod.Options, "/api/projects");
        request.Headers.Add("Origin", "http://localhost:5173");
        request.Headers.Add("Access-Control-Request-Method", "POST");
        request.Headers.Add("Access-Control-Request-Headers", "authorization,content-type");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.True(response.Headers.Contains("Access-Control-Allow-Origin"));
    }
}