using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;
using FluentValidation;

namespace ResearchHub.Application.Common
{
    public static class ValidatorExtensions
    {
        public static async Task ValidateOrThrowAsync<T>(this IValidator<T> validator, T instance)
        {
            var result = await validator.ValidateAsync(instance);
            if (result.IsValid)
                return;

            var errors = result.Errors
                .GroupBy(e => JsonNamingPolicy.CamelCase.ConvertName(e.PropertyName))
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());

            throw new RequestValidationException(errors);
        }
    }
}