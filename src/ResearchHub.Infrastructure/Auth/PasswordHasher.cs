using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Security.Cryptography;
using ResearchHub.Application.Auth;

namespace ResearchHub.Infrastructure.Auth
{
    public class PasswordHasher : IPasswordHasher
    {
        private const int SaltSize = 16;
        private const int HashSize = 32;
        private const int Iterations = 100_000;
        private static readonly HashAlgorithmName Algorithm = HashAlgorithmName.SHA256;

        public string Hash(string password)
        {
            var salt = RandomNumberGenerator.GetBytes(SaltSize);
            var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, Algorithm, HashSize);

            return $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}.{Iterations}";
        }

        public bool Verify(string password, string hash)
        {
            var parts = hash.Split('.');
            if (parts.Length != 3)
                return false;

            var salt = Convert.FromBase64String(parts[0]);
            var storedHash = Convert.FromBase64String(parts[1]);
            var iterations = int.Parse(parts[2]);

            var computedHash = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, Algorithm, HashSize);

            return CryptographicOperations.FixedTimeEquals(computedHash, storedHash);
        }   
    }
}