using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ResearchHub.Application.Common;
public sealed class UserNames
{
    private readonly Dictionary<Guid, string> _names;

    private UserNames(Dictionary<Guid, string> names)
    {
        _names = names;
    }

    public static async Task<UserNames> LoadAsync(IUserRepository userRepository, IEnumerable<Guid> userIds)
    {
        var ids = userIds.Distinct().ToList();
        if (ids.Count == 0)
            return new UserNames(new Dictionary<Guid, string>());

        var users = await userRepository.GetByIdsAsync(ids);
        return new UserNames(users.ToDictionary(u => u.Id, u => u.DisplayName));
    }

    public string Of(Guid userId) =>
        _names.TryGetValue(userId, out var name) ? name : "Unknown user";

    public string? Of(Guid? userId) =>
        userId.HasValue ? Of(userId.Value) : null;
}