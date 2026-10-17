using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Net;
using System.Net.Http.Json;
using ResearchHub.Application.Auth;
using Xunit;

namespace ResearchHub.IntegrationTests
{
    public class AuthEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public AuthEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task Register_WithWeakPassword_Returns400WithFieldErrors()
        {
            var response = await _client.PostAsJsonAsync("/api/auth/register",
                new RegisterRequest("weak@example.com", "Weak User", "1234"));

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            var body = await response.Content.ReadAsStringAsync();
            Assert.Contains("\"password\"", body);
        }
        [Fact]
        public async Task Refresh_ReturnsNewTokenPair_AndRotationRejectsTheOldToken()
        {
            var register = await _client.PostAsJsonAsync("/api/auth/register",
                new RegisterRequest("refresh1@example.com", "Refresh User", "SecurePass123!"));
            Assert.Equal(HttpStatusCode.OK, register.StatusCode);
            var first = await register.Content.ReadJsonAsync<AuthResult>();

            var refreshed = await _client.PostAsJsonAsync("/api/auth/refresh", new RefreshRequest(first!.RefreshToken));
            Assert.Equal(HttpStatusCode.OK, refreshed.StatusCode);
            var second = await refreshed.Content.ReadJsonAsync<AuthResult>();

            Assert.NotEqual(first.RefreshToken, second!.RefreshToken);
            Assert.Equal(first.User.Id, second.User.Id);

            // Rotation: each refresh token is single-use
            var reuse = await _client.PostAsJsonAsync("/api/auth/refresh", new RefreshRequest(first.RefreshToken));
            Assert.Equal(HttpStatusCode.Unauthorized, reuse.StatusCode);
        }

        [Fact]
        public async Task Refresh_WithUnknownToken_Returns401()
        {
            var response = await _client.PostAsJsonAsync("/api/auth/refresh", new RefreshRequest("not-a-real-token"));

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }
    }
}