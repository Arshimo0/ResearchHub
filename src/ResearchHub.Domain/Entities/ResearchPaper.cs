using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ResearchHub.Domain.Entities
{
    public class ResearchPaper
    {
        private readonly List<Tag> _tags = new();
        public Guid Id { get; private set; }
        public Guid ProjectId { get; private set; }
        public string Title { get; private set; }
        public string Authors { get; private set; }
        public string Abstract { get; private set; }
        public DateTime? PublicationDate { get; private set; }
        public string? DoiOrUrl { get; private set; }
        public string? PdfReference { get; private set; }
        public Guid AddedByUserId { get; private set; }
        public DateTime CreatedAt { get; private set; }

        public IReadOnlyCollection<Tag> Tags => _tags.AsReadOnly();
        private ResearchPaper() { } // EF Core

        public ResearchPaper(Guid projectId,string title,string authors,string abstractText,
        DateTime? publicationDate,string? doiOrUrl,string? pdfReference,Guid addedByUserId)
        {
            if (string.IsNullOrWhiteSpace(title))
                throw new ArgumentException("Title cannot be empty.", nameof(title));

            Id = Guid.NewGuid();
            ProjectId = projectId;
            Title = title.Trim();
            Authors = authors?.Trim() ?? string.Empty;
            Abstract = abstractText?.Trim() ?? string.Empty;
            PublicationDate = publicationDate;
            DoiOrUrl = doiOrUrl?.Trim();
            PdfReference = pdfReference?.Trim();
            AddedByUserId = addedByUserId;
            CreatedAt = DateTime.UtcNow;
        }

        public void UpdateDetails(string title,string authors,string abstractText,
        DateTime? publicationDate,string? doiOrUrl,string? pdfReference)
        {
            if (string.IsNullOrWhiteSpace(title))
                throw new ArgumentException("Title cannot be empty.", nameof(title));

            Title = title.Trim();
            Authors = authors?.Trim() ?? string.Empty;
            Abstract = abstractText?.Trim() ?? string.Empty;
            PublicationDate = publicationDate;
            DoiOrUrl = doiOrUrl?.Trim();
            PdfReference = pdfReference?.Trim();
        }

        public void AddTag(Tag tag)
        {
            if (tag.ProjectId != ProjectId)
            throw new InvalidOperationException("Tag must belong to the same project as the paper.");

            if (_tags.Any(t => t.Id == tag.Id))
                return; // already tagged — silently a no-op, not an error

            _tags.Add(tag);
        }
        public void RemoveTag(Guid tagId)
        {
            var tag = _tags.SingleOrDefault(t => t.Id == tagId);
            if (tag is not null)
                _tags.Remove(tag);
        }
    }
}