using System.Text.Json;
using ResearchHub.Application.Common;

namespace ResearchHub.API.Middleware;

public class ExceptionHandlingMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex) when (!context.Response.HasStarted)
        {
            var problem = Map(ex);

            if (problem.Status >= 500)
                _logger.LogError(ex, "Unhandled exception processing {Method} {Path}",
                    context.Request.Method, context.Request.Path);
            else
                _logger.LogWarning("{Method} {Path} returned {Status}: {Message}",
                    context.Request.Method, context.Request.Path, problem.Status, ex.Message);

            await WriteProblemAsync(context, problem);
        }
    }

    private static ProblemInfo Map(Exception ex) => ex switch
    {
        RequestValidationException validation =>
            new(StatusCodes.Status400BadRequest, "Validation failed", null, validation.Errors),
        UnauthorizedAccessException =>
            new(StatusCodes.Status401Unauthorized, "Unauthorized", ex.Message, null),
        ForbiddenAccessException =>
            new(StatusCodes.Status403Forbidden, "Forbidden", ex.Message, null),
        KeyNotFoundException =>
            new(StatusCodes.Status404NotFound, "Not Found", ex.Message, null),
        InvalidOperationException =>
            new(StatusCodes.Status409Conflict, "Conflict", ex.Message, null),
        ArgumentException =>
            new(StatusCodes.Status400BadRequest, "Bad Request", ex.Message, null),
        _ =>
            new(StatusCodes.Status500InternalServerError, "Internal Server Error",
                "An unexpected error occurred.", null)
    };

    private static async Task WriteProblemAsync(HttpContext context, ProblemInfo problem)
    {
        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = problem.Status;

        var body = new Dictionary<string, object?>
        {
            ["title"] = problem.Title,
            ["status"] = problem.Status,
            ["traceId"] = context.TraceIdentifier
        };

        if (problem.Detail is not null)
            body["detail"] = problem.Detail;

        if (problem.Errors is not null)
            body["errors"] = problem.Errors;

        await context.Response.WriteAsync(JsonSerializer.Serialize(body, JsonOptions));
    }

    private sealed record ProblemInfo(
        int Status,
        string Title,
        string? Detail,
        IReadOnlyDictionary<string, string[]>? Errors);
}