using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Entities;
using Xunit;

namespace ResearchHub.UnitTests.Entities
{
    public class TagTests
    {
        [Fact]
        public void Constructor_NormalizesName_ToLowercaseAndTrimmed()
        {
            var tag = new Tag(Guid.NewGuid(), "  Computer-Vision  ");
            Assert.Equal("computer-vision", tag.Name);
        }

        [Fact]
        public void Constructor_WithEmptyName_ThrowsArgumentException()
        {
            Assert.Throws<ArgumentException>(() => new Tag(Guid.NewGuid(), ""));
        }
    }
}