using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Entities;
using Xunit;

namespace ResearchHub.UnitTests.Entities
{
    public class NoteTests
    {
        [Fact]
        public void Constructor_WithValidData_CreatesNote()
        {
            var note = new Note(Guid.NewGuid(), Guid.NewGuid(), "Interesting approach to attention.");

            Assert.NotEqual(Guid.Empty, note.Id);
            Assert.Equal("Interesting approach to attention.", note.Content);
            Assert.Null(note.UpdatedAt);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void Constructor_WithEmptyContent_ThrowsArgumentException(string content)
        {
            Assert.Throws<ArgumentException>(() => new Note(Guid.NewGuid(), Guid.NewGuid(), content));
        }

        [Fact]
        public void UpdateContent_SetsUpdatedAt()
        {
            var note = new Note(Guid.NewGuid(), Guid.NewGuid(), "Original");

            note.UpdateContent("Revised");

            Assert.Equal("Revised", note.Content);
            Assert.NotNull(note.UpdatedAt);
        }
    }
}