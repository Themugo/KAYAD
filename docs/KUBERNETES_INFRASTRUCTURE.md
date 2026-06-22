# Kubernetes Infrastructure Requirements

## Overview

This document outlines the infrastructure requirements for deploying the KAYAD platform on Kubernetes, including cluster specifications, resource requirements, networking, storage, and operational considerations.

## Cluster Requirements

### Minimum Cluster Specifications

**Control Plane**
- Kubernetes Version: 1.28+
- Control Plane Nodes: 3 (for HA)
- CPU: 4 vCPUs per node
- Memory: 8 GB per node
- Storage: 50 GB SSD

**Worker Nodes**
- Minimum Nodes: 3
- Recommended Nodes: 5-6
- CPU: 8 vCPUs per node
- Memory: 32 GB per node
- Storage: 100 GB SSD per node

**Total Cluster Capacity**
- CPU: 24-48 vCPUs
- Memory: 96-192 GB
- Storage: 300-600 GB

### Recommended Cloud Providers

- **AWS**: EKS (Elastic Kubernetes Service)
- **GCP**: GKE (Google Kubernetes Engine)
- **Azure**: AKS (Azure Kubernetes Service)
- **DigitalOcean**: DOKS (DigitalOcean Kubernetes)
- **Self-hosted**: kubeadm, k3s, or RKE

## Resource Requirements

### Backend Application

**Per Pod**
- CPU Request: 250m
- CPU Limit: 1000m
- Memory Request: 512Mi
- Memory Limit: 1Gi

**Total (3 replicas)**
- CPU: 750m - 3000m
- Memory: 1.5Gi - 3Gi

**HPA Scaling**
- Min Replicas: 3
- Max Replicas: 10
- Total Max Resources:
  - CPU: 10000m (10 cores)
  - Memory: 10Gi

### Frontend Application

**Per Pod**
- CPU Request: 100m
- CPU Limit: 500m
- Memory Request: 128Mi
- Memory Limit: 256Mi

**Total (2 replicas)**
- CPU: 200m - 1000m
- Memory: 256Mi - 512Mi

**HPA Scaling**
- Min Replicas: 2
- Max Replicas: 6
- Total Max Resources:
  - CPU: 3000m (3 cores)
  - Memory: 1.5Gi

### Supporting Services

**MongoDB**
- CPU: 2000m - 4000m
- Memory: 4Gi - 8Gi
- Storage: 100Gi (SSD)

**Redis**
- CPU: 500m - 1000m
- Memory: 1Gi - 2Gi
- Storage: 10Gi (SSD)

**Ingress Controller (NGINX)**
- CPU: 500m - 1000m
- Memory: 512Mi - 1Gi

**Monitoring Stack (Prometheus, Grafana)**
- CPU: 1000m - 2000m
- Memory: 2Gi - 4Gi
- Storage: 50Gi (SSD)

**Total Resource Requirements**
- CPU: ~15-25 cores
- Memory: ~20-30Gi
- Storage: ~200-300Gi

## Networking Requirements

### Network Architecture

```
Internet
    │
    ▼
┌─────────────────────────────────────┐
│      Load Balancer / Ingress         │
│         (NGINX Ingress)              │
└─────────────────────────────────────┘
    │
    ├─────────────────────────────────┐
    │                                 │
    ▼                                 ▼
┌──────────────┐              ┌──────────────┐
│   Frontend   │              │   Backend    │
│   Service    │◄────────────►│   Service    │
└──────────────┘              └──────────────┘
    │                                 │
    │                                 ├──────────────┐
    │                                 │              │
    │                                 ▼              ▼
    │                          ┌──────────┐  ┌──────────┐
    │                          │ MongoDB  │  │  Redis   │
    │                          └──────────┘  └──────────┘
    │
    ▼
┌──────────────┐
│ External     │
│ Services     │
│ (M-Pesa,     │
│  Cloudinary) │
└──────────────┘
```

### Network Policies

**Default Policy**: Deny all ingress/egress (whitelist approach)

**Allowed Traffic**:
- Frontend → Backend (port 5000)
- Backend → MongoDB (port 27017)
- Backend → Redis (port 6379)
- Backend → External APIs (port 443, 80)
- Ingress Controller → Frontend/Backend
- All pods → DNS (port 53)

### Ingress Configuration

**Domains**:
- kayad.space (Frontend)
- www.kayad.space (Frontend)
- api.kayad.space (Backend API)
- webhooks.kayad.space (Webhooks)

**TLS/SSL**:
- Certificate Manager: cert-manager
- Cluster Issuer: Let's Encrypt (production)
- Certificate Type: RSA 2048-bit

**Load Balancer**:
- Type: Cloud provider LB (AWS ALB, GCP LB, Azure LB)
- SSL Termination: At load balancer
- Health Checks: /health endpoint

## Storage Requirements

### Persistent Storage

**Backend Uploads**
- Type: ReadWriteMany (RWX)
- Storage Class: standard (or cloud-specific)
- Size: 50Gi
- Access Mode: Multiple pods need concurrent access

**Database Storage**
- Type: ReadWriteOnce (RWO)
- Storage Class: fast-ssd (or cloud-specific)
- Size: 100Gi
- Backup Strategy: Daily snapshots

**Redis Storage**
- Type: ReadWriteOnce (RWO)
- Storage Class: standard
- Size: 10Gi
- Persistence: Optional (can use ephemeral)

### Storage Classes

**AWS EBS**
- gp3 (General Purpose SSD)
- io2 (Provisioned IOPS SSD)

**GCP PD**
- pd-standard (Standard persistent disk)
- pd-ssd (SSD persistent disk)

**Azure Disk**
- Standard_LRS (Standard HDD)
- Premium_LRS (Premium SSD)

## Security Requirements

### Pod Security

**Security Context**:
- Run as non-root user (UID 1000)
- Read-only root filesystem
- No privilege escalation
- Drop all capabilities

**Network Security**:
- Network policies enabled
- Pod-to-pod communication restricted
- Egress to external services controlled

### Secrets Management

**Recommended Tools**:
- Kubernetes Secrets (base64 encoded)
- External Secrets Operator (sync from external vault)
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault

**Secrets Required**:
- Database connection strings
- Redis connection strings
- JWT secret
- API keys (M-Pesa, Cloudinary)
- SMTP credentials
- SMS API credentials

### RBAC

**Service Accounts**:
- Dedicated service account per application
- Least privilege principle
- Role-based access control

**Cluster Roles**:
- Namespace-scoped roles
- Custom roles for specific operations

## Monitoring and Observability

### Metrics Collection

**Prometheus**:
- Scrape interval: 15s
- Retention: 15 days
- Storage: 50Gi

**Metrics to Collect**:
- CPU, Memory, Disk usage
- Request rate, error rate, latency
- Custom application metrics
- Kubernetes cluster metrics

### Logging

**Logging Stack**:
- Fluent Bit / Fluentd (log collector)
- Elasticsearch (log storage)
- Kibana (log visualization)
- Loki (alternative to Elasticsearch)

**Log Retention**:
- Application logs: 30 days
- Audit logs: 90 days
- Access logs: 7 days

### Tracing

**Distributed Tracing**:
- Jaeger or Zipkin
- OpenTelemetry integration
- Trace sampling: 10% (production)

### Alerting

**Alert Manager**:
- Prometheus Alertmanager
- PagerDuty integration
- Slack/Email notifications

**Critical Alerts**:
- Pod crash loop
- High error rate (>5%)
- High latency (>1s P95)
- Resource exhaustion (>90%)
- Database connection failures

## High Availability

### Control Plane HA

- 3 control plane nodes
- etcd quorum maintained
- Load balancer for API server
- Automatic failover

### Application HA

- Minimum 3 replicas per service
- Pod anti-affinity (spread across nodes)
- PodDisruptionBudgets configured
- HPA for auto-scaling

### Data HA

**MongoDB**:
- Replica set (3 nodes)
- Automatic failover
- Read preference: secondary
- Write concern: majority

**Redis**:
- Redis Sentinel (3 nodes)
- Automatic failover
- Master-slave replication

## Disaster Recovery

### Backup Strategy

**Database Backups**:
- Frequency: Daily
- Retention: 30 days
- Offsite backup: Yes
- Backup type: Snapshot + Logical

**Configuration Backups**:
- Kubernetes manifests in Git
- Helm charts versioned
- Secrets backed up securely

### Recovery Procedures

**RTO (Recovery Time Objective)**: 4 hours
**RPO (Recovery Point Objective)**: 1 hour

**Recovery Steps**:
1. Restore from latest backup
2. Deploy application from Git
3. Apply configuration
4. Verify functionality
5. Switch traffic

## Deployment Strategies

### Rolling Update (Default)

- Gradual pod replacement
- Zero downtime
- Max surge: 1 pod
- Max unavailable: 0 pods

### Blue-Green Deployment

- Two identical environments
- Instant traffic switch
- Instant rollback
- Requires 2x resources

### Canary Deployment

- Gradual traffic split
- 5% → 10% → 25% → 50% → 100%
- Early error detection
- Requires service mesh or advanced ingress

## Cost Estimation

### AWS EKS (us-east-1)

**Monthly Costs**:
- EKS Cluster: $73/month
- EC2 Worker Nodes (3x m5.large): ~$300/month
- EBS Storage (300Gi): ~$30/month
- Load Balancer: ~$20/month
- **Total**: ~$423/month

### GCP GKE (us-central1)

**Monthly Costs**:
- GKE Cluster: $74/month
- Compute Engine (3x n2-standard-4): ~$360/month
- Persistent Disk (300Gi): ~$30/month
- Load Balancer: ~$18/month
- **Total**: ~$482/month

### Azure AKS (eastus)

**Monthly Costs**:
- AKS Cluster: Free (included in node cost)
- VM Nodes (3x Standard_D4s_v3): ~$360/month
- Managed Disks (300Gi): ~$30/month
- Load Balancer: ~$18/month
- **Total**: ~$408/month

## Prerequisites

### Tools Required

**Cluster Management**:
- kubectl (1.28+)
- helm (3.12+)
- kustomize (optional)

**CI/CD**:
- GitHub Actions
- Docker registry (Docker Hub, ECR, GCR, ACR)

**Monitoring**:
- Prometheus
- Grafana
- Alertmanager

### Initial Setup

1. **Create Kubernetes cluster**
   ```bash
   # AWS EKS
   eksctl create cluster --name kayad --region us-east-1
   ```

2. **Install NGINX Ingress Controller**
   ```bash
   helm install ingress-nginx ingress-nginx/ingress-nginx \
     --namespace ingress-nginx --create-namespace
   ```

3. **Install cert-manager**
   ```bash
   helm install cert-manager jetstack/cert-manager \
     --namespace cert-manager --create-namespace \
     --set installCRDs=true
   ```

4. **Create namespace**
   ```bash
   kubectl create namespace kayad
   ```

5. **Create secrets**
   ```bash
   kubectl create secret generic kayad-secrets \
     --from-literal=mongo-uri="mongodb://..." \
     --from-literal=redis-url="redis://..." \
     --namespace kayad
   ```

6. **Deploy MongoDB**
   ```bash
   helm install mongodb bitnami/mongodb \
     --namespace kayad --set architecture=replicaset
   ```

7. **Deploy Redis**
   ```bash
   helm install redis bitnami/redis \
     --namespace kayad --set architecture=replication
   ```

8. **Deploy applications**
   ```bash
   helm install kayad-backend ./helm/kayad-backend \
     --namespace kayad
   helm install kayad-frontend ./helm/kayad-frontend \
     --namespace kayad
   ```

## Maintenance

### Regular Tasks

**Daily**:
- Monitor cluster health
- Review alerts
- Check resource utilization

**Weekly**:
- Review security vulnerabilities
- Check backup status
- Review logs for anomalies

**Monthly**:
- Update Kubernetes version
- Update Helm charts
- Review and optimize resource limits
- Disaster recovery drill

**Quarterly**:
- Security audit
- Cost optimization review
- Capacity planning
- Architecture review

### Scaling Considerations

**Vertical Scaling**:
- Increase node resources
- Update pod resource limits
- Monitor performance impact

**Horizontal Scaling**:
- Add worker nodes
- Adjust HPA settings
- Use cluster autoscaler

## Troubleshooting

### Common Issues

**Pod Not Starting**:
- Check resource limits
- Verify image pull policy
- Review pod events
- Check node capacity

**High Memory Usage**:
- Review memory limits
- Check for memory leaks
- Add more nodes
- Optimize application

**Network Issues**:
- Verify network policies
- Check DNS resolution
- Review ingress configuration
- Test connectivity

### Debug Commands

```bash
# Check pod status
kubectl get pods -n kayad

# View pod logs
kubectl logs -n kayad <pod-name>

# Describe pod
kubectl describe pod -n kayad <pod-name>

# Check events
kubectl get events -n kayad --sort-by='.lastTimestamp'

# Check resource usage
kubectl top nodes
kubectl top pods -n kayad

# Port forward for debugging
kubectl port-forward -n kayad <pod-name> 5000:5000
```

## Compliance and Governance

### Compliance Requirements

**Data Protection**:
- GDPR compliance
- Data encryption at rest
- Data encryption in transit
- Data retention policies

**Security Standards**:
- CIS Kubernetes Benchmark
- OWASP Top 10
- Regular security audits
- Penetration testing

### Audit Logging

**Audit Events**:
- Pod creation/deletion
- Secret access
- ConfigMap changes
- RBAC changes
- Network policy changes

**Retention**:
- Audit logs: 90 days
- Access logs: 30 days
- Security logs: 180 days

## Support and SLA

### Support Levels

**Level 1**: Basic monitoring and alerting
**Level 2**: Automated remediation
**Level 3**: 24/7 on-call support

### SLA Targets

**Availability**: 99.9% (monthly)
**Response Time**: < 200ms (P95)
**Error Rate**: < 0.1%
**Recovery Time**: < 4 hours

## Appendix

### Useful Links

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager](https://cert-manager.io/)
- [Prometheus](https://prometheus.io/)
- [Grafana](https://grafana.com/)

### Contact

For infrastructure-related questions:
- DevOps Team: devops@kayad.space
- Infrastructure Lead: infra@kayad.space

---

**Last Updated**: June 22, 2026
**Next Review**: September 22, 2026
