using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Entities;
using ResearchHub.Domain.Enums;
using Xunit;

namespace ResearchHub.UnitTests.Entities
{
    public class ResearchTaskTests
    {
        private static ResearchTask CreateTask() =>
        new(Guid.NewGuid(), "Read the paper", "Summarize section 3", TaskPriority.Medium, Guid.NewGuid());

        [Fact]
        public void Constructor_DefaultsToToDoAndUnassigned()
        {
            var task = CreateTask();

            Assert.Equal(ResearchTaskStatus.Todo, task.Status);
            Assert.Null(task.AssignedToUserId);
            Assert.Null(task.CompletedAt);
        }

        [Fact]
        public void Constructor_WithEmptyTitle_ThrowsArgumentException()
        {
            Assert.Throws<ArgumentException>(() =>
                new ResearchTask(Guid.NewGuid(), "", "desc", TaskPriority.Low, Guid.NewGuid()));
        }

        [Fact]
        public void AssignTo_SetsAssignee()
        {
            var task = CreateTask();
            var userId = Guid.NewGuid();

            task.AssignTo(userId);

            Assert.Equal(userId, task.AssignedToUserId);
        }

        [Fact]
        public void Unassign_ClearsAssignee()
        {
            var task = CreateTask();
            task.AssignTo(Guid.NewGuid());

            task.Unassign();

            Assert.Null(task.AssignedToUserId);
        }

        [Fact]
        public void ChangeStatus_ToDone_SetsCompletedAt()
        {
            var task = CreateTask();

            task.ChangeStatus(ResearchTaskStatus.Done);

            Assert.Equal(ResearchTaskStatus.Done, task.Status);
            Assert.NotNull(task.CompletedAt);
        }

        [Fact]
        public void ChangeStatus_FromDoneBackToInProgress_ClearsCompletedAt()
        {
            var task = CreateTask();
            task.ChangeStatus(ResearchTaskStatus.Done);

            task.ChangeStatus(ResearchTaskStatus.InProgress);

            Assert.Equal(ResearchTaskStatus.InProgress, task.Status);
            Assert.Null(task.CompletedAt);
        }
    }
}