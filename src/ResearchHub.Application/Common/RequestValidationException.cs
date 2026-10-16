using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ResearchHub.Application.Common
{
    public class RequestValidationException : Exception
    {
        public IReadOnlyDictionary<string, string[]> Errors { get; }

        public RequestValidationException(IReadOnlyDictionary<string, string[]> errors)
            : base("One or more validation errors occurred.")
        {
            Errors = errors;
        }
    }
}