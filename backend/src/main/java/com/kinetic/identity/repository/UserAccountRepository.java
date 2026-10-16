package com.kinetic.identity.repository;

import com.kinetic.identity.domain.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;
import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {

    Optional<UserAccount> findByEmailNormalized(String emailNormalized);
}
