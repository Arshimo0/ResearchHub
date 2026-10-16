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
    }
}