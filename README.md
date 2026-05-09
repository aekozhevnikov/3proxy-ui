# 3proxy Admin UI

A comprehensive web-based administration interface for managing [3proxy](https://github.com/3proxy/3proxy) proxy servers. Built with Next.js, React, and TypeScript, this UI provides intuitive controls for user management, traffic monitoring, configuration, and system observability.

![3proxy Admin UI Dashboard](https://via.placeholder.com/800x400/0d6efd/ffffff?text=3proxy+Admin+UI+Dashboard)

## Features

- **User Management**: Create, edit, and deactivate proxy users with data limits and expiration dates
- **Traffic Monitoring**: Real-time bandwidth usage tracking and analytics
- **Authentication System**: Secure login with JWT-based sessions and role-based access control
- **Configuration Management**: View and modify 3proxy settings through an intuitive interface
- **Telegram Integration**: Receive notifications for account deactivations and system events
- **Docker Support**: Easy deployment with Docker and Docker Compose
- **RESTful API**: Well-documented API for programmatic access and integration
- **Observability**: Built-in logging, metrics, and health checks
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

### Frontend
- **Framework**: Next.js 16.2+ with React 19.1+
- **UI Library**: HeroUI (formerly React Aria) for accessible, beautiful components
- **Styling**: Tailwind CSS 4.2+ with Tailwind Variants
- **Form Handling**: React Hook Form with Zod validation
- **State Management**: React Context and SWR for data fetching
- **Icons**: Lucide React
- **QR Code Generation**: QR Code Styling and Qrcode

### Backend
- **Runtime**: Node.js with TypeScript
- **ORM**: Prisma 6.19+ with PostgreSQL/SQLite support
- **Authentication**: JWT (JSON Web Tokens) with jose library
- **Password Hashing**: Bcrypt
- **HTTP Client**: Telegraf for Telegram bot integration
- **Logging**: Winston with daily rotation
- **Background Jobs**: Node-cron for scheduled maintenance tasks
- **API Routes**: Next.js API routes for RESTful endpoints

### DevOps & Infrastructure
- **Containerization**: Docker with multi-architecture support (amd64, arm64)
- **CI/CD**: GitHub Actions for automated testing and deployment
- **Testing**: Jest for unit tests, Playwright for E2E testing
- **Code Quality**: ESLint with Prettier formatting
- **Type Safety**: TypeScript 5.6+ with strict mode
- **Database**: Prisma ORM with migration system
- **Build Tools**: TSX, TSC-Alias, Vite for development

## Architecture

```
3proxy-admin/
├── src/
│   ├── app/              # Next.js 13+ app router
│   │   ├── api/          # API routes (auth, users, config, logs, etc.)
│   │   ├── admin/        # Admin dashboard and user management
│   │   ├── login/        # Authentication pages
│   │   └── ...           # Other pages
│   ├── components/       # Reusable UI components
│   ├── core/             # Core utilities (session, config, logging)
│   ├── hooks/            # Custom React hooks
│   ├── scripts/          # CLI scripts (setup, build, maintenance)
│   └── prisma/           # Prisma schema and database utilities
├── 3proxy/               # 3proxy binaries, configs, and logs
├── data/                 # Application data (sync info, etc.)
├── public/               # Static assets
├── tests/                # Test files (unit, e2e)
└── scripts/              # Deployment and maintenance scripts
```

## Quick Start

### Prerequisites
- Node.js 20.x or later
- Docker and Docker Compose (for containerized deployment)
- PostgreSQL or SQLite database
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/3proxy-admin.git
   cd 3proxy-admin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize the database**
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Start the development server**
   ```bash
   npm run dev:next
   # or
   npm run dev  # For full stack with background jobs
   ```

6. **Access the application**
   Open http://localhost:3000 in your browser

### Docker Deployment

For detailed Docker deployment instructions, environment variables reference, and Docker Compose configuration, see **[DOCKER.md](DOCKER.md)**.

Quick start:
```bash
docker run -d \
  --name 3proxy-admin \
  -p 3000:3000 \
  -p 3128:3128 \
  -p 1080:1080 \
  -e JWT_SECRET="your-secret-at-least-32-characters-long" \
  -e PROXY_DOMAIN="proxy.example.com" \
  hungryking/3proxy-admin:latest
```

**Default credentials** (change immediately after first login):
- Username: `admin`
- Password: `admin`

## Configuration

### Environment Variables
Copy `.env.example` to `.env` and adjust the following key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL/SQLite connection string | `file:./dev.db` |
| `NEXTAUTH_SECRET` | Secret for JWT encryption | Generate with `openssl rand -hex 32` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for notifications | (optional) |
| `API_URL` | Base URL for API requests | `http://localhost:3000` |
| `TRAFFIC_SYNC_INTERVAL` | Cron schedule for traffic sync | `*/30 * * * *` (every 30 minutes) |
| `PROXYAUTH_PATH` | Path to 3proxy .proxyauth file | `./3proxy/users/.proxyauth` |
| `LOGS_DIR` | Directory containing 3proxy logs | `./3proxy/logs` |

### 3proxy Integration
The UI expects a running 3proxy instance with:
- JSON logging enabled
- `.proxyauth` file for user authentication
- Access to log files for traffic analysis

See the [3proxy documentation](https://3proxy.org/) for server setup instructions.

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/change-credentials` - Change password
- `POST /api/auth/session` - Check session status

### User Management
- `GET /api/admin/users` - List all users
- `POST /api/admin/users/create` - Create new user
- `GET /api/admin/users/[id]/edit` - Get user for editing
- `POST /api/admin/users/[id]/edit` - Update user
- `POST /api/admin/users/maintenance` - Run traffic sync and maintenance

### System & Monitoring
- `GET /api/system/status` - Get system status (3proxy, users, logs)
- `GET /api/api/config/status` - Get 3proxy configuration
- `GET /api/api/logs` - Get recent log entries
- `GET /api/api/users/traffic` - Get user traffic statistics
- `GET /api/api/health` - Health check endpoint

### Maintenance Jobs (triggered via API or scheduler)
- `sync-job` - Outline synchronization
- `health-check-job` - System health checks
- `dak-job` - Delete old account knowledge
- `ip-limit-job` - IP limit enforcement

## Database Schema

The application uses Prisma ORM with the following main models:

- **ProxyUser**: Stores user credentials, limits, and status
- **Session**: Manages user sessions (if using database sessions)
- **TrafficLog**: Optional traffic logging for detailed analytics

Run `npx prisma studio` to visualize and manage the database.

## Testing

### Unit Tests
```bash
npm run test:unit
```

### E2E Tests
```bash
npm run test:e2e
```

### All Tests
```bash
npm run test:all
```

### Test Coverage
The project includes:
- Unit tests for utility functions and API routes
- E2E tests covering user flows and critical functionality
- Test utilities for mocking and helpers

## Deployment

### Docker
```bash
# Build the image
docker build -t 3proxy-admin .

# Run the container
docker run -d -p 3000:3000 \
  -e DATABASE_URL="file:/app/data/prod.db" \
  -e NEXTAUTH_SECRET="your-secret-here" \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/3proxy:/app/3proxy \
  3proxy-admin
```

### Docker Compose (Recommended)
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/app/data/prod.db
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - API_URL=http://localhost:3000
    volumes:
      - ./data:/app/data
      - ./3proxy:/app/3proxy
    restart: unless-stopped
```

### Kubernetes
See the `deployments/helm/` directory for Helm chart resources (currently being migrated).

## Observability

### Logging
- Application logs stored in `./logs/` directory
- Winston logger with multiple transports (console, file)
- Request logging for all API endpoints
- Error tracking with stack traces

### Metrics
- Built-in metrics collection for:
  - API response times
  - Database query performance
  - Background job execution
  - User authentication events
- Exportable via Prometheus (work in progress)

### Health Checks
- `/api/api/health` - Liveness and readiness probes
- Database connectivity checks
- 3proxy process verification
- Disk space monitoring

## Security Features

- **Authentication**: JWT-based with HttpOnly cookies
- **Authorization**: Role-based access control (admin/user)
- **Input Validation**: Server-side validation for all inputs
- **Password Security**: Bcrypt hashing with salt
- **Session Management**: Secure session handling with expiration
- **CORS**: Configurable CORS policies
- **Helmet**: Security headers via Next.js
- **Audit Logging**: Admin actions logged for compliance
- **Environment Secrets**: Sensitive data stored in environment variables

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and submission process.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [3proxy](https://github.com/3proxy/3proxy) - The powerful proxy server being managed
- [HeroUI](https://heroui.com/) - Beautiful, accessible UI components
- [Next.js](https://nextjs.org/) - The React framework for production
- [Prisma](https://www.prisma.io/) - Modern ORM for Node.js and TypeScript
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- All contributors and users of this project

## Support

For issues, questions, or feature requests:
1. Check the [existing issues](https://github.com/your-username/3proxy-admin/issues)
2. Open a new issue with detailed information
3. Join our community discussions

## Roadmap

Planned features for future releases:
- [ ] Real-time WebSocket dashboard for live traffic monitoring
- [ ] Advanced analytics and reporting
- [ ] LDAP/Active Directory integration
- [ ] SAML/OAuth2 authentication providers
- [ ] Automated backup and restore functionality
- [ ] Multi-tenancy support
- [ ] Plugin architecture for extensibility
- [ ] Enhanced observability with Grafana dashboards
- [ ] Automated SSL certificate management (Let's Encrypt)