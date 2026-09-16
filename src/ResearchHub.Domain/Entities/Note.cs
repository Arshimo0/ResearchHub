using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ResearchHub.Domain.Entities
{
    public class Note
    {
        public Guid Id { get; private set; }
        public Guid PaperId { get; private set; }
        public Guid AuthorId { get; private set; }
        public string Content { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime? UpdatedAt { get; private set; }

        private Note() { } //EF Core

        public Note(Guid paperId, Guid authorId, string content)
        {
            if (string.IsNullOrWhiteSpace(content))
                throw new ArgumentException("Note content cannot be empty.", nameof(content));
                
            Id = Guid.NewGuid();
            PaperId = paperId;
            AuthorId = authorId;
            Content = content.Trim();
            CreatedAt = DateTime.UtcNow;
        }

        public void UpdateContent(string content)
        {
            if (string.IsNullOrWhiteSpace(content))
            {
                throw new ArgumentException("Note content cannot be empty.", nameof(content));
            }

            Content = content.Trim();
            UpdatedAt = DateTime.UtcNow;
        }
    }
}