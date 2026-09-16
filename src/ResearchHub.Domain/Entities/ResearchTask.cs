using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using ResearchHub.Domain.Enums;
namespace ResearchHub.Domain.Entities
{
    public class ResearchTask
    {
        public Guid Id { get; private set; }
        public Guid ProjectId { get; private set; }
        public Guid? PaperId { get; private set; }
        public string Title { get; private set; }
        public string Description { get; private set; }
        public ResearchTaskStatus Status { get; private set; }
        public TaskPriority Priority { get; private set; }
        public DateTime? Deadline { get; private set; }
        public Guid? AssignedToUserId { get; private set; }
        public Guid CreatedByUserId { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime? CompletedAt { get; private set; }
        
        public ResearchTask(Guid projectId,string title,string description,TaskPriority priority,
        Guid createdByUserId,DateTime? deadline = null,Guid? paperId = null)
        {
            if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Task title cannot be empty.", nameof(title));

            Id = Guid.NewGuid();
            ProjectId = projectId;
            PaperId = paperId;
            Title = title.Trim();
            Description = description?.Trim() ?? string.Empty;
            Status = ResearchTaskStatus.Todo;
            Priority = priority;
            Deadline = deadline;
            CreatedByUserId = createdByUserId;
            CreatedAt = DateTime.UtcNow;
        }
        public void UpdateDetails(string title,string description,TaskPriority priority,DateTime? deadline)
        {
            if(string.IsNullOrWhiteSpace(title))
                throw new ArgumentException("Task title can not be empty", nameof(title));

            Title = title.Trim();
            Description = description?.Trim() ?? string.Empty;
            Priority = priority;
            Deadline = deadline;
        }

        public void AssignTo(Guid userId)
        {
            AssignedToUserId = userId;
        }

        public void Unassign()
        {
            AssignedToUserId = null;
        }

        public void ChangeStatus(ResearchTaskStatus newStatus)
        {
            if(Status == newStatus)
                return;

            Status = newStatus;
            CompletedAt = newStatus == ResearchTaskStatus.Done ? DateTime.UtcNow : null;
        }
    }
}