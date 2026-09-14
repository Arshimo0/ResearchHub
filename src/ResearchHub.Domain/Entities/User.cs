using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ResearchHub.Domain.Enums;

namespace ResearchHub.Domain.Entities;
public class User
{
    public Guid Id { get; private set; }
    public string Email { get; private set; }
    public string DisplayName  { get; private set; }
    public string PasswordHash   { get; set; }
    public PlatformRole PlatformRole { get; private set; }
    public DateTime CreatedAt { get; private set; }
    private User() { }
    public User(string email, string displayName, string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Email cannot be empty.", nameof(email));

        if (string.IsNullOrWhiteSpace(displayName))
            throw new ArgumentException("Display name cannot be empty.", nameof(displayName));  
        
        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new ArgumentException("Password hash cannot be empty.", nameof(passwordHash));
            
        Id = Guid.NewGuid();
        Email = email.Trim().ToLowerInvariant();
        DisplayName = displayName.Trim();
        PasswordHash = passwordHash;
        PlatformRole = PlatformRole.User;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateProfile(string displayName)
    {
        if (string.IsNullOrWhiteSpace(displayName))
            throw new ArgumentException("Display name cannot be empty.", nameof(displayName));

        DisplayName = displayName.Trim();
    }

    public void PromoteToAdmin()
    {
        PlatformRole = PlatformRole.Admin;
    }
}
