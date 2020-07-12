---
title: Spring Aop实现乐观锁重试
date: 2020-07-08 00:00:00
tags: ['java','spring']
---
> 并发修改同一记录时，避免更新丢失，需要加锁。要么在应用层加锁，要么在缓存加锁，要么在数据库层使用乐观锁，使用version作为更新依据。
说明：如果每次访问冲突概率小于20%，推荐使用乐观锁，否则使用悲观锁。乐观锁的重试次数不得小于3次。

阿里巴巴开发手册中指出乐观锁需要至少重试三次，但是我厂的应用好像都没有这个习惯，遇到冲突就直接抛错，这样对于用户来说就会相对不友好一些。
那么如何来实现这个乐观锁重试呢。
采用AOP应该是相对优雅的一种方式。
首先定义一个异常类方便精确定位乐观锁更新异常。当然如果使用jpa的话，可以直接捕获`ObjectOptimisticLockingFailureException`
```Java
public class OptimisticLockingFailureException extends RuntimeException {
    
    public OptimisticLockingFailureException(String message){
        super(message);
    }
}
```

定义一个切面。这里切的范围就看实际应用的范围了，以我厂的架构而言，可以直接切所有RPC接口的实现。当然也可以精确到切所有DAO层的方法。这个看应用场景。为了演示方便，我这里就定义一个注解，用来切这个注解的方法，当然在实际应用中也可以像我这么搞。
定义注解
```Java
@Retention(RetentionPolicy.RUNTIME)
public @interface TryAgain {
}
```
切面实现
```Java
@Aspect
@Component
@Slf4j
public class OptimisticLockTryAgainAspect {


    @Value("${optimistic.lock.retry.num:3}")
    private Integer maxRetries;

    @Pointcut("@annotation(TryAgain)")
    public void retryOnOptFailure() {
    }

    @Around("retryOnOptFailure()")
    @Transactional(rollbackFor = Exception.class)
    public Object doConcurrentOperation(ProceedingJoinPoint pjp) throws Throwable {
        int retries = 0;
        do {
            retries++;
            try {
                return pjp.proceed();
            } catch (OptimisticLockingFailureException ex) {
                if (retries > maxRetries) {
                    throw new RuntimeException("update.fail");
                }else{
                    log.warn("retry {} num",retries);
                }
            }
        } while (retries <= this.maxRetries);
        return null;
    }
}
```
这样如果再update的时候，如果更新失败就可以抛`OptimisticLockingFailureException`来做到重试了。
