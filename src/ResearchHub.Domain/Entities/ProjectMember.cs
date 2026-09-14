using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Enums;

namespace ResearchHub.Domain.Entities
{
    public class ProjectMember
    {
        public Guid Id { get; private set; }
        public Guid ProjectId { get; private set; }
        public Guid UserId { get; private set; }
        public ProjectRole ProjectRole { get; private set; }
        public DateTime JoinedAt { get; private set; }

        private ProjectMember() { } //Ef core

        internal ProjectMember(Guid projectId, Guid userId, ProjectRole role)
        {
            Id = Guid.NewGuid();
            ProjectId = projectId;
            UserId = userId;
            ProjectRole = role;
            JoinedAt = DateTime.UtcNow;
        }

        internal void Changerole(ProjectRole newrole)
        {
            ProjectRole = newrole;
        }
    }
}