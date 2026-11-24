package com.tpg.automation.novustrial.services;

import com.tpg.services.BaseUrlService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Scope;
import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.stereotype.Service;

@Service
@Scope(value = "thread-scope", proxyMode = ScopedProxyMode.TARGET_CLASS)
public class UrlService extends BaseUrlService {

    @Value("${aut.baseUrl:}")
    private String baseUrl;

    @Value("${aut.apiBaseUrl:}")
    private String apiBaseUrl;

    @Override
    public String baseUrl() {
        if (baseUrl == null || baseUrl.isBlank()) {
            throw new IllegalStateException("aut.baseUrl is not set");
        }
        return baseUrl;
    }

    public String apiBaseUrl() {
        return apiBaseUrl == null || apiBaseUrl.isBlank() ? baseUrl() : apiBaseUrl;
    }
}
