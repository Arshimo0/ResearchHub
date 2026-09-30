using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ResearchHub.Infrastructure.Persistence;
using Testcontainers.MsSql;
using Microsoft.Extensions.Configuration;
namespace ResearchHub.IntegrationTests
{
    public class CustomWebApplicationFactory :WebApplicationFactory<Program>, IAsyncLifetime
    {
        private readonly MsSqlContainer _dbContainer = new MsSqlBuilder()
        .WithPassword("YourStrong@Passw0rd")
        .Build();
        // Replaces the application's default DbContext registration with an isolated Testcontainers SQL Server instance for integration testing.
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureAppConfiguration((context, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Jwt:Secret"] = "integration-test-signing-key-at-least-32-characters-long",
                    ["Jwt:Issuer"] = "ResearchHub",
                    ["Jwt:Audience"] = "ResearchHubClient",
                    ["Jwt:AccessTokenExpiryMinutes"] = "30"
                });
            });

            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<ResearchHubDbContext>));

                if (descriptor is not null)
                    services.Remove(descriptor);

                services.AddDbContext<ResearchHubDbContext>(options =>
                    options.UseSqlServer(_dbContainer.GetConnectionString()));

                services.PostConfigure<Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerOptions>(
                    Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme,
                    options =>
                    {
                        options.TokenValidationParameters.IssuerSigningKey =
                            new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                                System.Text.Encoding.UTF8.GetBytes("integration-test-signing-key-at-least-32-characters-long"));
                        options.TokenValidationParameters.ValidIssuer = "ResearchHub";
                        options.TokenValidationParameters.ValidAudience = "ResearchHubClient";
                    });
            });
        }
        // Starts the test database container and applies EF migrations before tests run; tears down the container afterward.
        public async Task InitializeAsync()
        {
            await _dbContainer.StartAsync();

            using var scope = Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ResearchHubDbContext>();
            await dbContext.Database.MigrateAsync();
        }
        public new async Task DisposeAsync()
        {
            await _dbContainer.DisposeAsync();
        }
    }
}