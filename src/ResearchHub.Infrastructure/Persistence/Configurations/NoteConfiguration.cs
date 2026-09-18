using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResearchHub.Domain.Entities;

namespace ResearchHub.Infrastructure.Persistence.Configurations
{
    public class NoteConfiguration : IEntityTypeConfiguration<Note>
    {
        public void Configure(EntityTypeBuilder<Note> builder)
        {
            builder.ToTable("Notes");

            builder.HasKey(n => n.Id);

            builder.Property(n => n.Content)
                .IsRequired()
                .HasMaxLength(4000);

            builder.Property(n => n.CreatedAt)
                .IsRequired();

            builder.HasIndex(n => n.PaperId);

            builder.HasOne<User>()
                .WithMany()
                .HasForeignKey(n => n.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne<ResearchPaper>()
                .WithMany()
                .HasForeignKey(n => n.PaperId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}