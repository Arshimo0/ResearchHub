using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
namespace ResearchHub.API.Middleware
{
 
    public class ExceptionHandlingMiddleware
    {
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled exception processing {Method} {Path}", context.Request.Method, context.Request.Path);

                var (statusCode, title) = MapException(ex);

                context.Response.ContentType = "application/problem+json";
                context.Response.StatusCode = statusCode;

                var problemDetails = new
                {
                    title,
                    status = statusCode,
                    detail = ex.Message
                };

                await context.Response.WriteAsync(JsonSerializer.Serialize(problemDetails));
            }
        }

        private static (int StatusCode, string Title) MapException(Exception ex) => ex switch
        {
            UnauthorizedAccessException => ((int)HttpStatusCode.Unauthorized, "Unauthorized"),
            InvalidOperationException => ((int)HttpStatusCode.Conflict, "Conflict"),
            ArgumentException => ((int)HttpStatusCode.BadRequest, "Bad Request"),
            _ => ((int)HttpStatusCode.InternalServerError, "Internal Server Error")
        };
    }
}