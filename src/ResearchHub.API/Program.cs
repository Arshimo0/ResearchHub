using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ResearchHub.Application.Auth;
using ResearchHub.Application.Common;
using ResearchHub.Infrastructure.Auth;
using ResearchHub.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
builder.Services.AddDbContext<ResearchHubDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("ResearchHubDb")));
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi

// Bind JWT settings from configuration (appsettings + User Secrets)
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));

// Application services
builder.Services.AddScoped<AuthService>();

// Infrastructure implementations
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

// JWT Bearer authentication
var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()
    ?? throw new InvalidOperationException("Jwt configuration section is missing.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtSettings.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
// OpenAPI / Swagger
builder.Services.AddControllers();
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(entry => entry.Value is { Errors.Count: > 0 })
            .GroupBy(entry =>
            {
                var key = entry.Key.TrimStart('$', '.');
                return key.Length == 0 ? "request" : JsonNamingPolicy.CamelCase.ConvertName(key);
            })
            .ToDictionary(
                group => group.Key,
                group => group
                    .SelectMany(entry => entry.Value!.Errors)
                    .Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage)
                        ? "The value is invalid."
                        : e.ErrorMessage)
                    .ToArray());

        var problem = new ValidationProblemDetails(errors)
        {
            Title = "Validation failed",
            Status = StatusCodes.Status400BadRequest
        };
        problem.Extensions["traceId"] = context.HttpContext.TraceIdentifier;

        return new BadRequestObjectResult(problem)
        {
            ContentTypes = { "application/problem+json" }
        };
    };
});
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddScoped<IProjectRepository, ProjectRepository>();
builder.Services.AddScoped<ResearchHub.Application.Projects.ProjectService>();
builder.Services.AddScoped<IPaperRepository, PaperRepository>();
builder.Services.AddScoped<ITagRepository, TagRepository>();
builder.Services.AddScoped<ResearchHub.Application.Papers.PaperService>();
builder.Services.AddScoped<INoteRepository, NoteRepository>();
builder.Services.AddScoped<ResearchHub.Application.Notes.NoteService>();
builder.Services.AddScoped<IResearchTaskRepository, ResearchTaskRepository>();
builder.Services.AddScoped<ResearchHub.Application.ResearchTasks.ResearchTaskService>();
builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();
builder.Services.AddScoped<ResearchHub.Application.Users.UserService>();
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod());
});
var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "ResearchHub API v1");
        options.RoutePrefix = "swagger";
    });
}
app.UseMiddleware<ResearchHub.API.Middleware.ExceptionHandlingMiddleware>();

app.UseHttpsRedirection();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
public partial class Program { }