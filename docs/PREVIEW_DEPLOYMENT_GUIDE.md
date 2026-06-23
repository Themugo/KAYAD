---
title: PREVIEW_DEPLOYMENT_GUIDE
owner: @devops-lead
team: devops
last-reviewed: 2026-06-23
review-frequency: monthly
status: active
tags: [deployment]
---
# Preview Deployment Testing Guide

This guide explains how to test preview deployments for the KAYAD application.

## Overview

Preview deployments are automatically created for pull requests to the `main` branch. They provide a production-like environment for testing changes before merging.

## Prerequisites

- GitHub repository access
- Render account (for backend preview)
- Vercel account (for frontend preview)
- GitHub Secrets configured (RENDER_API_KEY, VERCEL_TOKEN, etc.)

## Preview Deployment Workflow

### Automatic Trigger

Preview deployments are automatically triggered when:
- A pull request is opened to `main`
- A pull request is synchronized (new commits pushed)
- A pull request is reopened

### Workflow Process

1. **CI Pipeline Runs**
   - Tests execute
   - Lint checks pass
   - Security scans complete

2. **Preview Deployment**
   - Backend deploys to Render preview environment
   - Frontend deploys to Vercel preview deployment
   - Preview URLs are generated

3. **URL Generation**
   - Backend: `kayad-backend-preview-<pr-number>.onrender.com`
   - Frontend: Vercel preview URL (shown in PR comments)

## Testing Preview Deployments

### 1. Access Preview URLs

After the workflow completes, preview URLs are available:
- Check the GitHub Actions workflow run
- Look for the deployment step output
- URLs are also posted as PR comments

### 2. Backend Testing

**Health Check**
```bash
curl https://kayad-backend-preview-<pr-number>.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": { "status": "healthy" },
    "redis": { "status": "healthy" },
    "memory": { "status": "healthy" }
  }
}
```

**API Testing**
```bash
# Test authentication
curl -X POST https://kayad-backend-preview-<pr-number>.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test public endpoints
curl https://kayad-backend-preview-<pr-number>.onrender.com/api/cars

# Test protected endpoints (with token)
curl https://kayad-backend-preview-<pr-number>.onrender.com/api/users/profile \
  -H "Authorization: Bearer <token>"
```

### 3. Frontend Testing

1. Open the Vercel preview URL
2. Test user authentication flow
3. Test critical user journeys
4. Test responsive design
5. Test cross-browser compatibility

### 4. Integration Testing

**Test External Integrations**
- M-Pesa integration (sandbox mode)
- Email sending
- SMS sending
- File uploads to Cloudinary
- WebSocket connections

**Test Database Operations**
- Create test data
- Update records
- Delete records
- Verify data persistence

**Test Real-time Features**
- WebSocket connections
- Live auction updates
- Chat functionality
- Real-time notifications

## Testing Checklist

### Pre-Merge Testing

- [ ] Health check endpoint returns 200
- [ ] Database connectivity verified
- [ ] Redis connectivity verified
- [ ] Authentication flow works
- [ ] Critical API endpoints responding
- [ ] Frontend loads without errors
- [ ] User registration works
- [ ] User login works
- [ ] File uploads work
- [ ] WebSocket connections work

### Feature-Specific Testing

**For Payment Features**
- [ ] M-Pesa STK push works
- [ ] Payment callback handling works
- [ ] Escrow flow works
- [ ] Refund flow works
- [ ] Transaction verification works

**For Auction Features**
- [ ] Bid placement works
- [ ] Auction timer works
- [ ] Snipe guard works
- [ ] Winner selection works
- [ ] Real-time updates work

**For Admin Features**
- [ ] User management works
- [ ] Content moderation works
- [ ] Reports generation works
- [ ] Audit logs work
- [ ] Bulk operations work

### Performance Testing

- [ ] Page load time < 3s
- [ ] API response time < 500ms
- [ ] No console errors
- [ ] Memory usage within limits
- [ ] CPU usage within limits

### Security Testing

- [ ] Rate limiting works
- [ ] Input validation works
- [ ] Authentication required for protected routes
- [ ] CORS configured correctly
- [ ] No sensitive data exposed

## Troubleshooting

### Preview Deployment Fails

**Problem**: Preview deployment workflow fails

**Solution**:
1. Check GitHub Actions logs
2. Verify GitHub Secrets are configured
3. Check Render/Vercel service status
4. Verify API keys are valid
5. Check for syntax errors in code

### Preview URL Not Accessible

**Problem**: Preview URL returns 404 or 503

**Solution**:
1. Wait a few minutes for deployment to complete
2. Check deployment logs in Render/Vercel
3. Verify environment variables are set
4. Check health check endpoint
5. Restart deployment if needed

### Database Connection Issues

**Problem**: Preview deployment can't connect to database

**Solution**:
1. Verify database URL is configured
2. Check database credentials
3. Verify database is accessible
4. Check network/firewall settings
5. Use test database for preview

### External Service Failures

**Problem**: External services (M-Pesa, email, SMS) not working

**Solution**:
1. Verify API keys are configured
2. Check service status
3. Use sandbox/test mode for preview
4. Mock external services if needed
5. Check callback URLs

## Best Practices

### Preview Environment Configuration

1. **Use Test Data**
   - Separate database for preview
   - Test accounts only
   - No production data

2. **Sandbox Mode**
   - Use M-Pesa sandbox
   - Use test email services
   - Use test SMS services
   - Mock payment processing

3. **Resource Limits**
   - Limit database size
   - Limit API calls
   - Limit file uploads
   - Set reasonable timeouts

### Testing Strategy

1. **Smoke Tests**
   - Health check
   - Authentication
   - Critical endpoints
   - Basic functionality

2. **Integration Tests**
   - External services
   - Database operations
   - Real-time features
   - File uploads

3. **User Acceptance Testing**
   - Critical user journeys
   - Edge cases
   - Error handling
   - Performance

4. **Regression Testing**
   - Previously fixed bugs
   - Known issues
   - Feature interactions
   - Data integrity

### Communication

1. **PR Description**
   - Describe changes
   - List testing steps
   - Note any breaking changes
   - Include preview URLs

2. **Team Review**
   - Code review
   - Testing review
   - Security review
   - Performance review

3. **Documentation**
   - Update documentation
   - Add migration notes
   - Update API docs
   - Update deployment docs

## Cleanup

### After Merge

1. **Delete Preview Environment**
   - Preview environments auto-delete after PR merge
   - Manual cleanup if needed
   - Remove test data from database

2. **Archive PR**
   - Mark PR as merged
   - Archive conversation
   - Document lessons learned

3. **Update Documentation**
   - Update changelog
   - Update release notes
   - Update deployment docs
   - Update API docs

## Monitoring

### Preview Deployment Monitoring

1. **Logs**
   - Check Render logs
   - Check Vercel logs
   - Check application logs
   - Check error logs

2. **Metrics**
   - Response times
   - Error rates
   - Resource usage
   - API call counts

3. **Alerts**
   - Error rate threshold
   - Response time threshold
   - Resource usage threshold
   - Service availability

## Security Considerations

1. **No Production Data**
   - Use test database
   - Use test accounts
   - No real user data
   - No real payment data

2. **Limited Access**
   - Restrict preview access
   - Use authentication
   - Limit API calls
   - Monitor access logs

3. **Secret Management**
   - Use test secrets
   - Rotate preview secrets
   - Don't reuse production secrets
   - Monitor secret usage

## Preview Deployment Checklist

### Before Creating PR
- [ ] Code tested locally
- [ ] Unit tests passing
- [ ] Lint checks passing
- [ ] Documentation updated
- [ ] Breaking changes documented

### After PR Created
- [ ] CI pipeline passes
- [ ] Preview deployment successful
- [ ] Preview URLs accessible
- [ ] Health check passes
- [ ] Smoke tests passed

### Before Merge
- [ ] Integration tests passed
- [ ] User acceptance testing passed
- [ ] Code review completed
- [ ] Security review completed
- [ ] Performance review completed

### After Merge
- [ ] Preview environment cleaned up
- [ ] Test data removed
- [ ] Documentation updated
- [ ] Team notified
- [ ] Lessons learned documented

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Preview Deployments Best Practices](https://vercel.com/docs/deployments/preview-deployments)
