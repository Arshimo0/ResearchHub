using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using ResearchHub.API.Middleware;
using ResearchHub.Application.Common;
using Xunit;
using ResearchHub.Domain.Exceptions;
namespace ResearchHub.IntegrationTests;

public class ExceptionHandlingMiddlewareTests
{
    private static async Task<(int Status, string Body)> RunAsync(Exception toThrow)
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        var middleware = new ExceptionHandlingMiddleware(
            _ => throw toThrow,
            NullLogger<ExceptionHandlingMiddleware>.Instance);

        await middleware.InvokeAsync(context);

        context.Response.Body.Position = 0;
        var body = await new StreamReader(context.Response.Body).ReadToEndAsync();

        return (context.Response.StatusCode, body);
    }

    [Fact]
    public async Task UnexpectedException_Returns500WithoutLeakingMessage()
    {
        var (status, body) = await RunAsync(new Exception("connection string password=hunter2"));

        Assert.Equal(500, status);
        Assert.DoesNotContain("hunter2", body);
        Assert.Contains("An unexpected error occurred.", body);
        Assert.Contains("traceId", body);
    }

    [Fact]
    public async Task ValidationException_Returns400WithFieldErrors()
    {
        var errors = new Dictionary<string, string[]> { ["name"] = new[] { "Name is required." } };

        var (status, body) = await RunAsync(new RequestValidationException(errors));

        Assert.Equal(400, status);
        Assert.Contains("Validation failed", body);
        Assert.Contains("\"name\"", body);
    }

    [Fact]
    public async Task ForbiddenException_Returns403WithItsMessage()
    {
        var (status, body) = await RunAsync(new ForbiddenAccessException("Only a project owner can perform this action."));

        Assert.Equal(403, status);
        Assert.Contains("Only a project owner can perform this action.", body);
    }
    [Fact]
    public async Task DomainException_Returns409WithItsMessage()
    {
        var (status, body) = await RunAsync(new CannotRemoveLastOwnerException());

        Assert.Equal(409, status);
        Assert.Contains("at least one owner", body);
    }
}