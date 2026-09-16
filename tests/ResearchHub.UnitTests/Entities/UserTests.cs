using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Entities;
using Xunit;

namespace ResearchHub.UnitTests.Entities
{
    public class UserTests
    {
        [Fact]
        public void Constructor_WithValidData_CreatesUser()
        {
            var user = new User("test@example.com", "Test User", "hashed-password");

            Assert.NotEqual(Guid.Empty, user.Id);
            Assert.Equal("test@example.com", user.Email);
            Assert.Equal("Test User", user.DisplayName);
            Assert.Equal(Domain.Enums.PlatformRole.User, user.PlatformRole);
        }

        [Fact]
        public void Constructor_NormalizesEmail_ToLowercaseAndTrimmed()
        {
            var user = new User("  Test@Example.COM  ", "Test User", "hashed-password");
            Assert.Equal("test@example.com", user.Email);
        }
        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        public void Constructor_WithInvalidEmail_ThrowsArgumentException(string invalidEmail)
        {
            Assert.Throws<ArgumentException>(() =>
            new User(invalidEmail, "Test User", "hashed-password"));
        }
        [Fact]
        public void UpdateProfile_WithValidDisplayName_UpdatesDisplayName()
        {
            var user = new User("test@example.com", "Old Name", "hashed-password");
            user.UpdateProfile("New Name");
            Assert.Equal("New Name", user.DisplayName);
        }
        [Fact]
        public void PromoteToAdmin_SetsRoleToAdmin()
        {
            var user = new User("test@example.com", "Test User", "hashed-password");
            user.PromoteToAdmin();
            Assert.Equal(Domain.Enums.PlatformRole.Admin, user.PlatformRole);
        }
    }
}