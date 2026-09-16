using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Entities;
using Xunit;

namespace ResearchHub.UnitTests.Entities
{
    public class ResearchPaperTests
    {
        private static ResearchPaper CreatePaper(Guid projectId) =>
        new(projectId, "Attention Is All You Need", "Vaswani et al.", "abstract text",
            new DateTime(2017, 6, 12), "https://doi.org/xyz", null, Guid.NewGuid());

        [Fact]
        public void Constructor_WithValidData_CreatesPaper()
        {
            var projectId = Guid.NewGuid();
            var paper = CreatePaper(projectId);

            Assert.NotEqual(Guid.Empty, paper.Id);
            Assert.Equal(projectId, paper.ProjectId);
            Assert.Equal("Attention Is All You Need", paper.Title);
            Assert.Empty(paper.Tags);
        }

        [Fact]
        public void Constructor_WithEmptyTitle_ThrowsArgumentException()
        {
            Assert.Throws<ArgumentException>(() =>
                new ResearchPaper(Guid.NewGuid(), "", "authors", "abstract", null, null, null, Guid.NewGuid()));
        }

        [Fact]
        public void AddTag_FromSameProject_AddsSuccessfully()
        {
            var projectId = Guid.NewGuid();
            var paper = CreatePaper(projectId);
            var tag = new Tag(projectId, "computer-vision");

            paper.AddTag(tag);

            Assert.Single(paper.Tags);
            Assert.Contains(paper.Tags, t => t.Name == "computer-vision");
        }

        [Fact]
        public void AddTag_FromDifferentProject_ThrowsInvalidOperationException()
        {
            var paper = CreatePaper(Guid.NewGuid());
            var tagFromOtherProject = new Tag(Guid.NewGuid(), "unrelated");

            Assert.Throws<InvalidOperationException>(() => paper.AddTag(tagFromOtherProject));
        }

        [Fact]
        public void AddTag_SameTagTwice_IsIdempotent()
        {
            var projectId = Guid.NewGuid();
            var paper = CreatePaper(projectId);
            var tag = new Tag(projectId, "survey");

            paper.AddTag(tag);
            paper.AddTag(tag);

            Assert.Single(paper.Tags);
        }

        [Fact]
        public void RemoveTag_ExistingTag_RemovesSuccessfully()
        {
            var projectId = Guid.NewGuid();
            var paper = CreatePaper(projectId);
            var tag = new Tag(projectId, "to-read");
            paper.AddTag(tag);

            paper.RemoveTag(tag.Id);

            Assert.Empty(paper.Tags);
        }
    }
}