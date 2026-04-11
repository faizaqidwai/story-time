package com.codekluster.story_time.service;

import com.codekluster.story_time.dto.auth.AccessTokenRequest;
import com.codekluster.story_time.dto.auth.AccessTokenResponse;
import com.codekluster.story_time.dto.auth.RefreshTokenRequest;

public interface AuthService {

    AccessTokenResponse getRegisterToken(AccessTokenRequest accessTokenRequest);

    AccessTokenResponse loginWithUserPrimaryDevice(AccessTokenRequest accessTokenRequest);

    AccessTokenResponse loginWithUserCredentials(AccessTokenRequest accessTokenRequest);

    /**
     * Validates the refresh token, checks session expiry, and — if everything
     * is valid — returns a fresh pair of access + refresh tokens and extends
     * the session's expiryDateTime by 5 minutes.
     */
    AccessTokenResponse refreshToken(RefreshTokenRequest refreshTokenRequest);
}
