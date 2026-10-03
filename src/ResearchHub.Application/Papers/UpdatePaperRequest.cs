using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ResearchHub.Application.Papers
{
    public record UpdatePaperRequest(
        string Title,
        string Authors,
        string Abstract,
        DateTime? PublicationDate,
        string? DoiOrUrl,
        string? PdfReference);
}