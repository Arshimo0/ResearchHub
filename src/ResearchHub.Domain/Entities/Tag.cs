using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ResearchHub.Domain.Entities
{
    public class Tag
    {
        public Guid Id { get; private set; }
        public Guid ProjectId { get; private set; }
        public string Name { get; private set; }

        private Tag() { } // EF Core

        public Tag(Guid projectId, string name)
            {
                if (string.IsNullOrWhiteSpace(name))
                    throw new ArgumentException("Tag name cannot be empty.", nameof(name));

                Id = Guid.NewGuid();
                ProjectId = projectId;
                Name = name.Trim().ToLowerInvariant();
            }
    }
}