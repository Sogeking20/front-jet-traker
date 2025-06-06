document.addEventListener('DOMContentLoaded', function() {
    // Конфигурация приложения
    const config = {
        apiBaseUrl: 'https://api.yourdomain.com/v1',
        stripePublicKey: 'pk_test_your_stripe_key',
        localStorageKeys: {
            subscription: 'current_subscription',
            employeeCount: 'current_employees'
        }
    };

    // Инициализация Stripe
    let stripe = Stripe(config.stripePublicKey);
    let elements;

    // DOM элементы
    const DOM = {
        planCards: document.querySelectorAll('.plan-card'),
        subscriptionPayment: document.querySelector('.subscription-payment'),
        subscribeBtn: document.getElementById('subscribe-btn'),
        cancelSubscriptionBtn: document.getElementById('cancel-subscription-btn'),
        currentSubscription: document.querySelector('.current-subscription'),
        subscriptionUsage: document.querySelector('.subscription-usage'),
        progressBar: document.querySelector('.progress'),
        cardElement: document.getElementById('card-element'),
        paymentForm: document.getElementById('payment-form')
    };

    // Состояние приложения
    const state = {
        selectedPlan: null,
        isLoading: false,
        paymentIntent: null
    };

    // Инициализация приложения
    function init() {
        setupEventListeners();
        loadCurrentSubscription();
        checkEmployeeLimit();
        initStripeElements();
    }

    // Настройка обработчиков событий
    function setupEventListeners() {
        // Выбор плана подписки
        DOM.planCards.forEach(card => {
            const selectBtn = card.querySelector('.btn');
            if (selectBtn && !selectBtn.disabled) {
                selectBtn.addEventListener('click', () => handlePlanSelect(card));
            }
        });

        // Оформление подписки
        if (DOM.subscribeBtn) {
            DOM.subscribeBtn.addEventListener('click', handleSubscription);
        }

        // Отмена подписки
        if (DOM.cancelSubscriptionBtn) {
            DOM.cancelSubscriptionBtn.addEventListener('click', handleCancelSubscription);
        }
    }

    // Инициализация Stripe Elements
    function initStripeElements() {
        if (!DOM.cardElement) return;

        elements = stripe.elements();
        const card = elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#32325d',
                    '::placeholder': {
                        color: '#aab7c4'
                    }
                },
                invalid: {
                    color: '#fa755a',
                    iconColor: '#fa755a'
                }
            }
        });

        card.mount(DOM.cardElement);

        // Регистрация обработчиков событий для валидации карты
        card.addEventListener('change', function(event) {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
                displayError.style.display = 'block';
            } else {
                displayError.textContent = '';
                displayError.style.display = 'none';
            }
        });
    }

    // Обработчики событий
    function handlePlanSelect(card) {
        // Удаляем выделение со всех карточек
        DOM.planCards.forEach(c => c.classList.remove('selected', 'selected-plan'));
        
        // Добавляем выделение текущей карточке
        card.classList.add('selected', 'selected-plan');
        
        // Сохраняем выбранный план
        state.selectedPlan = {
            id: card.dataset.planId,
            name: card.querySelector('.plan-card__title').textContent,
            price: card.querySelector('.plan-card__price').textContent,
            limit: parseInt(card.dataset.employeeLimit)
        };
        
        // Показываем форму оплаты
        DOM.subscriptionPayment.style.display = 'block';
        
        // Прокручиваем к форме оплаты
        DOM.subscriptionPayment.scrollIntoView({ behavior: 'smooth' });
    }

    async function handleSubscription() {
        if (!state.selectedPlan) {
            showNotification('Пожалуйста, выберите план подписки', 'error');
            return;
        }

        if (state.isLoading) return;
        state.isLoading = true;

        try {
            // Показываем индикатор загрузки
            DOM.subscribeBtn.disabled = true;
            DOM.subscribeBtn.innerHTML = '<span class="spinner"></span> Обработка...';

            // Создаем Payment Intent на сервере
            const response = await fetch(`${config.apiBaseUrl}/subscriptions/create-payment-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                    planId: state.selectedPlan.id,
                    customerEmail: getUserEmail()
                })
            });

            if (!response.ok) {
                throw new Error('Не удалось создать платежное намерение');
            }

            const { clientSecret } = await response.json();

            // Подтверждаем платеж с Stripe
            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: elements.getElement('card'),
                    billing_details: {
                        name: document.getElementById('card-name').value
                    }
                }
            });

            if (error) {
                throw error;
            }

            // Платеж успешен - оформляем подписку
            await createSubscription(paymentIntent.id);

            // Обновляем UI
            updateSubscriptionUI();
            checkEmployeeLimit();

            showNotification('Подписка успешно оформлена!', 'success');
            
            // Скрываем форму оплаты
            DOM.subscriptionPayment.style.display = 'none';

        } catch (error) {
            console.error('Subscription error:', error);
            showNotification(error.message || 'Ошибка при оформлении подписки', 'error');
        } finally {
            DOM.subscribeBtn.disabled = false;
            DOM.subscribeBtn.textContent = 'Оформить подписку';
            state.isLoading = false;
        }
    }

    async function handleCancelSubscription() {
        if (!confirm('Вы действительно хотите отменить подписку? После отмены вы будете переведены на бесплатный тариф с ограниченными возможностями.')) {
            return;
        }

        try {
            state.isLoading = true;
            DOM.cancelSubscriptionBtn.disabled = true;
            DOM.cancelSubscriptionBtn.innerHTML = '<span class="spinner"></span> Обработка...';

            const response = await fetch(`${config.apiBaseUrl}/subscriptions/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('Не удалось отменить подписку');
            }

            // Обновляем локальное состояние
            localStorage.setItem(config.localStorageKeys.subscription, JSON.stringify({
                plan: 'free',
                name: 'Бесплатный план',
                price: '0 ₽',
                limit: 5,
                status: 'canceled'
            }));

            // Обновляем UI
            updateSubscriptionUI();
            checkEmployeeLimit();

            showNotification('Подписка успешно отменена', 'success');

        } catch (error) {
            console.error('Cancel subscription error:', error);
            showNotification(error.message || 'Ошибка при отмене подписки', 'error');
        } finally {
            DOM.cancelSubscriptionBtn.disabled = false;
            DOM.cancelSubscriptionBtn.textContent = 'Отменить подписку';
            state.isLoading = false;
        }
    }

    // Основные функции
    async function createSubscription(paymentIntentId) {
        const response = await fetch(`${config.apiBaseUrl}/subscriptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                planId: state.selectedPlan.id,
                paymentIntentId
            })
        });

        if (!response.ok) {
            throw new Error('Не удалось создать подписку');
        }

        const subscription = await response.json();

        // Сохраняем подписку в localStorage
        localStorage.setItem(config.localStorageKeys.subscription, JSON.stringify({
            plan: subscription.planId,
            name: state.selectedPlan.name,
            price: state.selectedPlan.price,
            limit: state.selectedPlan.limit,
            status: 'active',
            nextPayment: subscription.nextPaymentDate
        }));

        return subscription;
    }

    function loadCurrentSubscription() {
        const savedSubscription = localStorage.getItem(config.localStorageKeys.subscription);
        if (savedSubscription) {
            try {
                const subscription = JSON.parse(savedSubscription);
                updateSubscriptionUI(subscription);
            } catch (e) {
                console.error('Failed to parse saved subscription', e);
            }
        }
    }

    function updateSubscriptionUI(subscription = null) {
        if (!subscription) {
            subscription = JSON.parse(localStorage.getItem(config.localStorageKeys.subscription) || '{}');
        }

        if (DOM.currentSubscription) {
            const title = DOM.currentSubscription.querySelector('h3');
            const description = DOM.currentSubscription.querySelector('p');
            const cancelBtn = DOM.cancelSubscriptionBtn;

            if (subscription.plan && subscription.plan !== 'free') {
                title.textContent = subscription.name;
                description.textContent = subscription.nextPayment ? 
                    `Следующее списание: ${subscription.price} (${formatDate(subscription.nextPayment)})` : 
                    `Текущий план: ${subscription.price}`;
                
                if (cancelBtn) {
                    cancelBtn.disabled = subscription.status === 'canceled';
                }
            } else {
                title.textContent = 'Бесплатный план';
                description.textContent = 'Следующее списание: не требуется';
                if (cancelBtn) {
                    cancelBtn.disabled = true;
                }
            }
        }
    }

    function checkEmployeeLimit() {
        // Получаем текущее количество сотрудников (в реальном приложении - с сервера)
        const currentEmployees = parseInt(localStorage.getItem(config.localStorageKeys.employeeCount)) || 0;
        
        // Получаем текущий план подписки
        const subscription = JSON.parse(localStorage.getItem(config.localStorageKeys.subscription) || '{}');
        const currentPlanLimit = subscription.limit || 5; // Бесплатный план - 5 сотрудников
        
        // Рассчитываем процент использования
        const usagePercentage = Math.min((currentEmployees / currentPlanLimit) * 100, 100);
        
        // Обновляем progress bar
        if (DOM.progressBar) {
            DOM.progressBar.style.width = `${usagePercentage}%`;
            
            // Изменяем цвет в зависимости от заполненности
            if (usagePercentage >= 90) {
                DOM.progressBar.classList.add('danger');
                DOM.progressBar.classList.remove('warning');
            } else if (usagePercentage >= 70) {
                DOM.progressBar.classList.add('warning');
                DOM.progressBar.classList.remove('danger');
            } else {
                DOM.progressBar.classList.remove('warning', 'danger');
            }
        }
        
        // Создаем уведомление если接近 лимита
        showLimitAlert(currentEmployees, currentPlanLimit, usagePercentage);
    }

    function showLimitAlert(currentEmployees, limit, percentage) {
        // Удаляем старые уведомления
        document.querySelectorAll('.limit-alert').forEach(el => el.remove());
        
        // Создаем новое уведомление если接近 лимита
        if (percentage >= 80) {
            const limitAlert = document.createElement('div');
            
            if (percentage >= 100) {
                limitAlert.className = 'limit-alert danger';
                limitAlert.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 11V7M10 14H10.01M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z" stroke="#DC3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <div>
                        <strong>Лимит достигнут!</strong>
                        <p>Вы не можете добавить новых сотрудников (${currentEmployees}/${limit}). Перейдите на более высокий тариф.</p>
                    </div>
                    <a href="#subscription-plans" class="btn btn--small">Обновить тариф</a>
                `;
            } else {
                limitAlert.className = 'limit-alert warning';
                limitAlert.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 7V11M10 14H10.01M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z" stroke="#FFC107" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <div>
                        <strong>Приближается лимит</strong>
                        <p>Вы использовали ${currentEmployees} из ${limit} сотрудников (${Math.round(percentage)}%). Рассмотрите переход на более высокий тариф.</p>
                    </div>
                    <a href="#subscription-plans" class="btn btn--small btn--outline">Посмотреть тарифы</a>
                `;
            }
            
            if (DOM.subscriptionUsage) {
                DOM.subscriptionUsage.after(limitAlert);
            }
        }
    }

    // Вспомогательные функции
    function getAuthToken() {
        return localStorage.getItem('auth_token') || '';
    }

    function getUserEmail() {
        const userData = localStorage.getItem('user_data');
        if (userData) {
            try {
                return JSON.parse(userData).email;
            } catch {
                return null;
            }
        }
        return null;
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('ru-RU', options);
    }

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }

    // Инициализация приложения
    init();
});