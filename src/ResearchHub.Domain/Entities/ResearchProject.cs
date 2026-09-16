using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Enums;
using ResearchHub.Domain.Exceptions;

namespace ResearchHub.Domain.Entities
{
    public class ResearchProject
    {
        private readonly List<ProjectMember> _members = new List<ProjectMember>();

        public Guid Id { get; private set; }
        public string Name { get; private set; }
        public string Description { get; private set; }
        public ProjectStatus Status { get; private set; }
        public DateTime CreatedAt { get; private set; }

        public IReadOnlyCollection<ProjectMember> Members => _members.AsReadOnly();
        private ResearchProject() { } // EF Core

        public ResearchProject(string name, string description,Guid ownerId)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Project name cannot be empty.", nameof(name));

            // if (string.IsNullOrWhiteSpace(description))
            //     throw new ArgumentException("Project description cannot be empty.", nameof(description));

            Id = Guid.NewGuid();
            Name = name.Trim();
            Description = description.Trim() ?? string.Empty;
            Status = ProjectStatus.Active;
            CreatedAt = DateTime.UtcNow;

            _members.Add(new ProjectMember(Id, ownerId, ProjectRole.Owner));
        }
        public void changeStatus(ProjectStatus newStatus)
        {
            Status = newStatus;
        }
        public void UpdateDetails(string name, string decription)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Project name cannot be empty.", nameof(name));

            // if (string.IsNullOrWhiteSpace(decription))
            //     throw new ArgumentException("Project description cannot be empty.", nameof(decription));

            Name = name.Trim();
            Description = decription.Trim() ?? string.Empty;
        }
        public void AddMember(Guid userId, ProjectRole role)
        {
            if (_members.Any(m => m.UserId == userId))
                throw new InvalidOperationException("User is already a member of the project.");

            _members.Add(new ProjectMember(Id, userId, role));
        }
        private int CountOwners() => _members.Count(m => m.ProjectRole == ProjectRole.Owner);
        public void RemoveMember(Guid userId)
        {
            var member = _members.SingleOrDefault(m => m.UserId == userId)
                ?? throw new InvalidOperationException("User is not a member of this project.");

            if (member.ProjectRole == ProjectRole.Owner && CountOwners() == 1)
                throw new CannotRemoveLastOwnerException();

            _members.Remove(member);
        }
        public void ChangeMemberRole(Guid userId, ProjectRole newRole)
        {
            var member = _members.SingleOrDefault(m => m.UserId == userId)
                ?? throw new InvalidOperationException("User is not a member of this project.");

            if (member.ProjectRole == ProjectRole.Owner && newRole != ProjectRole.Owner && CountOwners() == 1)
                throw new CannotRemoveLastOwnerException();

            member.Changerole(newRole);
        }
    }
}