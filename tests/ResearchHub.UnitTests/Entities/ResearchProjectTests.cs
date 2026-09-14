using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Entities;
using ResearchHub.Domain.Enums;
using ResearchHub.Domain.Exceptions;
using Xunit;

namespace ResearchHub.UnitTests.Entities
{
    public class ResearchProjectTests
    {
        [Fact]
        public void Constructor_CreatesProject_WithOwnerAsFirstMember()
        {
            var ownerId = Guid.NewGuid();
            var project = new ResearchProject("AI Research", "Studying CV models", ownerId);

            Assert.Single(project.Members);
            Assert.Equal(ownerId, project.Members.First().UserId);
            Assert.Equal(ProjectRole.Owner, project.Members.First().ProjectRole);
            Assert.Equal(ProjectStatus.Active, project.Status);
        }

        [Fact]
        public void Constructor_WithEmptyName_ThrowsArgumentException()
        {
            Assert.Throws<ArgumentException>(() =>
                new ResearchProject("", "description", Guid.NewGuid()));
        }

        [Fact]
        public void AddMember_NewUser_AddsSuccessfully()
        {
            var project = new ResearchProject("AI Research", "desc", Guid.NewGuid());
            var newMemberId = Guid.NewGuid();

            project.AddMember(newMemberId, ProjectRole.Member);

            Assert.Equal(2, project.Members.Count);
            Assert.Contains(project.Members, m => m.UserId == newMemberId && m.ProjectRole == ProjectRole.Member);
        }

        [Fact]
        public void AddMember_DuplicateUser_ThrowsInvalidOperationException()
        {
            var ownerId = Guid.NewGuid();
            var project = new ResearchProject("AI Research", "desc", ownerId);

            Assert.Throws<InvalidOperationException>(() =>
                project.AddMember(ownerId, ProjectRole.Member));
        }

        [Fact]
        public void RemoveMember_LastOwner_ThrowsCannotRemoveLastOwnerException()
        {
            var ownerId = Guid.NewGuid();
            var project = new ResearchProject("AI Research", "desc", ownerId);

            Assert.Throws<CannotRemoveLastOwnerException>(() =>
                project.RemoveMember(ownerId));
        }

        [Fact]
        public void RemoveMember_RegularMember_RemovesSuccessfully()
        {
            var project = new ResearchProject("AI Research", "desc", Guid.NewGuid());
            var memberId = Guid.NewGuid();
            project.AddMember(memberId, ProjectRole.Member);

            project.RemoveMember(memberId);

            Assert.Single(project.Members);
        }

        [Fact]
        public void RemoveMember_OneOfTwoOwners_RemovesSuccessfully()
        {
            var ownerId = Guid.NewGuid();
            var secondOwnerId = Guid.NewGuid();
            var project = new ResearchProject("AI Research", "desc", ownerId);
            project.AddMember(secondOwnerId, ProjectRole.Owner);

            project.RemoveMember(ownerId);

            Assert.Single(project.Members);
            Assert.Equal(secondOwnerId, project.Members.First().UserId);
        }

        [Fact]
        public void ChangeMemberRole_DemoteLastOwner_ThrowsCannotRemoveLastOwnerException()
        {
            var ownerId = Guid.NewGuid();
            var project = new ResearchProject("AI Research", "desc", ownerId);

            Assert.Throws<CannotRemoveLastOwnerException>(() =>
                project.ChangeMemberRole(ownerId, ProjectRole.Member));
        }
    }
}